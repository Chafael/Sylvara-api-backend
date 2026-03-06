import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import * as bcrypt from 'bcrypt';

import { SamplingPlot as MongoPlot, SamplingPlotDocument } from './schemas/sampling-plot.schema';
import { SamplingPlot as PgPlot } from '../../common/entities/sampling-plot.entity';
import { User } from '../../auth/entities/user.entity';
import { CreateProjectDto, PlotStatus } from './dto/create-project.dto';
import { UpdateProjectStatusRequest } from './dto/update-project-status.request';
import { ProjectResponseDto } from './dto/project-response.dto';


@Injectable()
export class ProjectsService {
    constructor(
        @InjectModel(MongoPlot.name)
        private readonly plotModel: Model<SamplingPlotDocument>,

        @InjectRepository(PgPlot)
        private readonly pgPlotRepo: Repository<PgPlot>,
    ) { }

    private toResponse(doc: SamplingPlotDocument): ProjectResponseDto {
        return plainToInstance(ProjectResponseDto, doc.toObject(), {
            excludeExtraneousValues: true,
        });
    }

    async create(dto: CreateProjectDto, userId: number): Promise<ProjectResponseDto> {
        // 1. Guardar en Postgres primero → obtener el ID numérico
        const pgPlot = this.pgPlotRepo.create({
            userId: userId,
            samplingPlotName: dto.samplingPlotName,
            description: dto.description ?? null,
            totalArea: dto.totalArea,
            unitId: dto.unitId,
            // Si no viene fecha, usamos hoy por defecto
            startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
            endDate: dto.endDate ? new Date(dto.endDate) : null,
            samplingPlotStatus: PlotStatus.ACTIVE,
        });
        const savedPg = await this.pgPlotRepo.save(pgPlot);

        // 2. Guardar en Mongo usando el ID de Postgres como postgresId
        const mongoDoc = new this.plotModel({
            name: dto.samplingPlotName,   // el schema de Mongo usa 'name'
            description: dto.description,
            totalArea: dto.totalArea,
            unitId: dto.unitId,
            unitName: 'Metros',
            userId,
            postgresId: savedPg.samplingPlotId,
            startDate: savedPg.startDate,
            endDate: dto.endDate ? new Date(dto.endDate) : undefined,
            currentCycleNumber: savedPg.currentCycleNumber,
        });
        const savedMongo = await mongoDoc.save();

        return this.toResponse(savedMongo);
    }

    async findAll(userId: number): Promise<ProjectResponseDto[]> {
        const plots = await this.plotModel.find({ userId }).exec();
        return plots.map(p => this.toResponse(p));
    }

    async findOne(plotId: number, userId: number): Promise<ProjectResponseDto> {
        const plot = await this.plotModel.findOne({ postgresId: plotId, userId }).exec();
        if (!plot) throw new NotFoundException(`No existe un proyecto con el ID especificado.`);
        return this.toResponse(plot);
    }

    async updateStatus(plotId: number, userId: number, dto: UpdateProjectStatusRequest): Promise<ProjectResponseDto> {
        const user = await this.pgPlotRepo.manager.findOne(User, {
            where: { user_id: userId },
            select: ['user_password']
        });

        if (!user || !user.user_password) throw new UnauthorizedException('Usuario no válido');

        const isValid = await bcrypt.compare(dto.password, user.user_password);
        if (!isValid) throw new UnauthorizedException('La contraseña ingresada para confirmar el cambio de estatus es incorrecta.');

        const pgPlot = await this.pgPlotRepo.findOne({ where: { samplingPlotId: plotId, userId: userId } });
        if (!pgPlot) throw new NotFoundException(`No existe un proyecto con el ID especificado.`);

        const newStatus = dto.samplingPlotStatus;
        if (newStatus === PlotStatus.INACTIVE) {
            pgPlot.endDate = new Date();
        } else if (newStatus === PlotStatus.ACTIVE && pgPlot.samplingPlotStatus === 'inactive') {
            pgPlot.currentCycleNumber += 1;
            pgPlot.endDate = null;
        }
        pgPlot.samplingPlotStatus = newStatus as any;

        const savedPg = await this.pgPlotRepo.save(pgPlot);

        const mongoPlot = await this.plotModel.findOneAndUpdate(
            { postgresId: plotId, userId },
            {
                $set: {
                    status: newStatus,
                    endDate: savedPg.endDate,
                    currentCycleNumber: savedPg.currentCycleNumber
                }
            },
            { new: true }
        ).exec();

        if (!mongoPlot) throw new NotFoundException(`No existe un proyecto con el ID especificado.`);

        return this.toResponse(mongoPlot);
    }

    async remove(plotId: number, userId: number): Promise<{ message: string }> {
        // Eliminar de Mongo y Postgres de forma atómica
        const mongoResult = await this.plotModel.findOneAndDelete({ postgresId: plotId, userId }).exec();
        if (!mongoResult) throw new NotFoundException(`Parcela con id ${plotId} no encontrada.`);

        await this.pgPlotRepo.delete({ samplingPlotId: plotId, userId: userId });

        return { message: 'Parcela eliminada exitosamente.' };
    }
}
