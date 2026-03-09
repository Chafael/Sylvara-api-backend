import {
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { SamplingPlot } from '../../common/entities/sampling-plot.entity';
import { UnitMeasurement } from '../../common/entities/unit-measurement.entity';
import { User } from '../../auth/entities/user.entity';
import { StudyZone } from '../../common/entities/study-zone.entity';
import { Species } from '../../common/entities/species.entity';
import { SpeciesZone } from '../../common/entities/species-zone.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectStatusDto, PlotStatus } from './dto/update-project-status.dto';
import { PlotResponseDto } from './dto/plot-response.dto';

export interface CursorMeta {
    nextCursor: number | null;
    limit: number;
}

export interface PaginatedProjects {
    data: PlotResponseDto[];
    meta: CursorMeta;
}

@Injectable()
export class ProjectsService {
    constructor(
        @InjectRepository(SamplingPlot)
        private readonly plotRepo: Repository<SamplingPlot>,

        @InjectRepository(UnitMeasurement)
        private readonly unitRepo: Repository<UnitMeasurement>,

        @InjectRepository(User)
        private readonly userRepo: Repository<User>,

        @InjectRepository(StudyZone)
        private readonly zoneRepo: Repository<StudyZone>,

        private readonly dataSource: DataSource,
    ) { }

    private toResponse(plot: SamplingPlot): PlotResponseDto {
        return {
            samplingPlotId: plot.sampling_plot_id,
            userId: plot.user_id,
            samplingPlotName: plot.sampling_plot_name,
            description: plot.description ?? null,
            totalArea: Number(plot.total_area),
            unitId: plot.unit_id,
            unitName: plot.unitMeasurement?.unit_name ?? '',
            samplingPlotStatus: plot.sampling_plot_status,
            currentCycleNumber: plot.current_cycle_number,
            startDate: plot.start_date ?? null,
            endDate: plot.end_date ?? null,
        };
    }

    private async findPlotForUser(plotId: number, userId: number): Promise<SamplingPlot> {
        const plot = await this.plotRepo.findOne({
            where: { sampling_plot_id: plotId, user_id: userId },
            relations: ['unitMeasurement'],
        });
        if (!plot) throw new NotFoundException('No existe un proyecto con el ID especificado.');
        return plot;
    }

    async findAll(
        userId: number,
        status?: string,
        cursor?: number,
        limit = 20,
    ): Promise<PaginatedProjects> {
        const take = Math.min(limit, 50);

        const qb = this.plotRepo
            .createQueryBuilder('p')
            .leftJoinAndSelect('p.unitMeasurement', 'um')
            .where('p.user_id = :userId', { userId })
            .orderBy('p.sampling_plot_id', 'DESC')
            .take(take);

        if (status) {
            qb.andWhere('p.sampling_plot_status = :status', { status });
        }

        if (cursor) {
            qb.andWhere('p.sampling_plot_id < :cursor', { cursor });
        }

        const plots = await qb.getMany();

        return {
            data: plots.map(p => this.toResponse(p)),
            meta: {
                nextCursor: plots.length === take ? plots[plots.length - 1].sampling_plot_id : null,
                limit: plots.length,
            },
        };
    }

    async create(dto: CreateProjectDto, userId: number): Promise<PlotResponseDto> {
        const plot = this.plotRepo.create({
            user_id: userId,
            sampling_plot_name: dto.samplingPlotName,
            description: dto.description ?? null,
            total_area: dto.totalArea,
            unit_id: dto.unitId,
        });

        const saved = await this.plotRepo.save(plot);

        const full = await this.plotRepo.findOne({
            where: { sampling_plot_id: saved.sampling_plot_id },
            relations: ['unitMeasurement'],
        });

        return this.toResponse(full!);
    }

    async update(plotId: number, userId: number, dto: UpdateProjectDto): Promise<PlotResponseDto> {
        await this.findPlotForUser(plotId, userId);

        await this.plotRepo.update(plotId, {
            ...(dto.samplingPlotName && { sampling_plot_name: dto.samplingPlotName }),
            ...(dto.description !== undefined && { description: dto.description }),
            ...(dto.totalArea !== undefined && { total_area: dto.totalArea }),
            ...(dto.unitId !== undefined && { unit_id: dto.unitId }),
            ...(dto.startDate !== undefined && { start_date: new Date(dto.startDate) }),
        });

        return this.findPlotForUser(plotId, userId).then(p => this.toResponse(p));
    }

    async updateStatus(plotId: number, userId: number, dto: UpdateProjectStatusDto): Promise<PlotResponseDto> {
        const plot = await this.findPlotForUser(plotId, userId);

        // verificar password del usuario
        const user = await this.userRepo.findOne({
            where: { user_id: userId },
            select: ['user_id', 'user_password'],
        });
        if (!user) throw new NotFoundException('Usuario no encontrado.');

        const isValid = await bcrypt.compare(dto.password, user.user_password);
        if (!isValid) {
            throw new UnauthorizedException('La contraseña ingresada para confirmar el cambio de estatus es incorrecta.');
        }

        // si se reactiva (inactive → active), validar áreas y avanzar ciclo
        if (plot.sampling_plot_status === PlotStatus.INACTIVE && dto.samplingPlotStatus === PlotStatus.ACTIVE) {
            const newCycle = plot.current_cycle_number + 1;

            await this.plotRepo.update(plotId, {
                sampling_plot_status: PlotStatus.ACTIVE,
                current_cycle_number: newCycle,
                end_date: null,
            });
        } else if (dto.samplingPlotStatus === PlotStatus.INACTIVE) {
            // al cerrar, validar que la suma de sub-áreas no exceda el área total
            const zonesSum = await this.zoneRepo
                .createQueryBuilder('z')
                .select('SUM(z.sub_area)', 'total')
                .where('z.sampling_plot_id = :plotId', { plotId })
                .andWhere('z.cycle_number = :cycle', { cycle: plot.current_cycle_number })
                .getRawOne();

            const sum = Number(zonesSum?.total ?? 0);
            if (sum > Number(plot.total_area)) {
                throw new UnprocessableEntityException('La sub-área ingresada excede el área total disponible de la parcela para el ciclo actual.');
            }

            await this.plotRepo.update(plotId, {
                sampling_plot_status: PlotStatus.INACTIVE,
                end_date: new Date(),
            });
        } else {
            await this.plotRepo.update(plotId, {
                sampling_plot_status: dto.samplingPlotStatus,
            });
        }

        return this.findPlotForUser(plotId, userId).then(p => this.toResponse(p));
    }

    async remove(plotId: number, userId: number): Promise<void> {
        const plot = await this.findPlotForUser(plotId, userId);

        await this.dataSource.transaction(async (manager) => {
            // 1. Obtener todas las zonas del proyecto
            const zones = await manager.find(StudyZone, {
                where: { sampling_plot_id: plotId },
            });
            const zoneIds = zones.map((z) => z.study_zone_id);

            if (zoneIds.length > 0) {
                // 2. Obtener especies únicas en estas zonas para limpieza posterior
                const speciesZones = await manager
                    .createQueryBuilder(SpeciesZone, 'sz')
                    .where('sz.study_zone_id IN (:...zoneIds)', { zoneIds })
                    .getMany();
                const speciesIds = [...new Set(speciesZones.map((sz) => sz.species_id))];

                // 3. Borrar registros de especies en las zonas (SpeciesZone)
                await manager.delete(SpeciesZone, { study_zone_id: In(zoneIds) });

                // 4. Borrar las zonas (StudyZone)
                await manager.delete(StudyZone, { sampling_plot_id: plotId });

                // 5. Limpieza de especies huérfanas
                for (const sId of speciesIds) {
                    const count = await manager.count(SpeciesZone, {
                        where: { species_id: sId },
                    });
                    if (count === 0) {
                        await manager.delete(Species, { species_id: sId });
                    }
                }
            }

            // 6. Borrar el proyecto (SamplingPlot)
            await manager.delete(SamplingPlot, { sampling_plot_id: plotId });
        });
    }
}