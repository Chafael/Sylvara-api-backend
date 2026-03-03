import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { SamplingPlot, SamplingPlotDocument } from './schemas/sampling-plot.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';

@Injectable()
export class ProjectsService {
    constructor(
        @InjectModel(SamplingPlot.name)
        private readonly plotModel: Model<SamplingPlotDocument>,
    ) { }

    private toResponse(doc: SamplingPlotDocument): ProjectResponseDto {
        return plainToInstance(ProjectResponseDto, doc.toObject(), {
            excludeExtraneousValues: true,
        });
    }

    async create(dto: CreateProjectDto, userId: number): Promise<ProjectResponseDto> {
        // El userId siempre viene del token, nunca del body
        const created = new this.plotModel({ ...dto, userId });
        const saved = await created.save();
        return this.toResponse(saved);
    }

    async findAll(userId: number): Promise<ProjectResponseDto[]> {
        const plots = await this.plotModel.find({ userId }).exec();
        return plots.map(p => this.toResponse(p));
    }

    async findOne(id: string, userId: number): Promise<ProjectResponseDto> {
        const plot = await this.plotModel.findOne({ _id: id, userId }).exec();
        if (!plot) throw new NotFoundException(`Parcela con id ${id} no encontrada.`);
        return this.toResponse(plot);
    }

    async remove(id: string, userId: number): Promise<{ message: string }> {
        const result = await this.plotModel.findOneAndDelete({ _id: id, userId }).exec();
        if (!result) throw new NotFoundException(`Parcela con id ${id} no encontrada.`);
        return { message: 'Parcela eliminada exitosamente.' };
    }
}
