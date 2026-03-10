import {
    Injectable,
    NotFoundException,
    UnauthorizedException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { DataSource, In, Repository } from 'typeorm';
import { Model } from 'mongoose';
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
import { ActivityCycle } from './schemas/activity-cycle.schema';

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

        @InjectRepository(SpeciesZone)
        private readonly speciesZoneRepo: Repository<SpeciesZone>,

        @InjectModel(ActivityCycle.name)
        private readonly activityCycleModel: Model<ActivityCycle>,

        private readonly dataSource: DataSource,
    ) {}

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

    private computeIndices(speciesZones: SpeciesZone[]) {
        const totalIndividuals = speciesZones.reduce((sum, sz) => sum + sz.individual_count, 0);
        const speciesRichness = speciesZones.length;

        const shannon = speciesZones.reduce((sum, sz) => {
            const p = sz.individual_count / (totalIndividuals || 1);
            return sum + (p > 0 ? -p * Math.log(p) : 0);
        }, 0);

        const simpson =
            totalIndividuals > 1
                ? 1 -
                  speciesZones.reduce(
                      (sum, sz) => sum + sz.individual_count * (sz.individual_count - 1),
                      0,
                  ) / (totalIndividuals * (totalIndividuals - 1))
                : 0;

        const margalef =
            totalIndividuals > 1 ? (speciesRichness - 1) / Math.log(totalIndividuals) : 0;

        const pielou = speciesRichness > 1 ? shannon / Math.log(speciesRichness) : 0;

        return {
            indices: { shannon, simpson, margalef, pielou },
            counts: { species_richness: speciesRichness, total_individuals: totalIndividuals },
        };
    }

    /**
     * Construye el snapshot completo e inmutable del ciclo para activity_cycles.
     * Solo se invoca cuando el proyecto pasa a inactive.
     */
    private async buildActivityCycleSnapshot(
        plot: SamplingPlot,
        endDate: Date,
    ) {
        const cycleNumber = plot.current_cycle_number;
        const plotId = plot.sampling_plot_id;

        const zones = await this.zoneRepo.find({
            where: { sampling_plot_id: plotId, cycle_number: cycleNumber },
        });

        // acumular species summary global (agrupado por especie)
        const speciesSummaryMap = new Map<
            number,
            {
                species_name: string;
                functional_type_name: string;
                total_individuals_in_plot: number;
                presence_in_zones: Set<string>;
            }
        >();

        const zonesDetails = await Promise.all(
            zones.map(async (zone) => {
                const speciesZones = await this.speciesZoneRepo.find({
                    where: { study_zone_id: zone.study_zone_id, cycle_number: cycleNumber },
                    relations: ['species', 'species.functionalType', 'unitMeasurement'],
                });

                const { indices } = this.computeIndices(speciesZones);

                for (const sz of speciesZones) {
                    const entry = speciesSummaryMap.get(sz.species_id);
                    if (entry) {
                        entry.total_individuals_in_plot += sz.individual_count;
                        entry.presence_in_zones.add(zone.name_study_zone);
                    } else {
                        speciesSummaryMap.set(sz.species_id, {
                            species_name: sz.species?.species_name ?? '',
                            functional_type_name: sz.species?.functionalType?.functional_type_name ?? '',
                            total_individuals_in_plot: sz.individual_count,
                            presence_in_zones: new Set([zone.name_study_zone]),
                        });
                    }
                }

                return {
                    study_zone_id: zone.study_zone_id,
                    name_study_zone: zone.name_study_zone,
                    indices,
                    speciesRecords: speciesZones.map((sz) => ({
                        species_name: sz.species?.species_name ?? '',
                        functional_type_name: sz.species?.functionalType?.functional_type_name ?? '',
                        individual_count: sz.individual_count,
                        height_stratum_min: Number(sz.height_stratum_min ?? 0),
                        height_stratum_max: Number(sz.height_stratum_max ?? 0),
                        unit_name: sz.unitMeasurement?.unit_name ?? '',
                    })),
                };
            }),
        );

        // métricas globales
        const allSpeciesZones =
            zones.length > 0
                ? await this.speciesZoneRepo
                      .createQueryBuilder('sz')
                      .where('sz.study_zone_id IN (:...ids)', {
                          ids: zones.map((z) => z.study_zone_id),
                      })
                      .andWhere('sz.cycle_number = :cycle', { cycle: cycleNumber })
                      .getMany()
                : [];

        const { indices: globalIndices, counts: globalCounts } =
            this.computeIndices(allSpeciesZones);

        const global_species_summary = Array.from(speciesSummaryMap.values()).map((s) => ({
            species_name: s.species_name,
            functional_type_name: s.functional_type_name,
            total_individuals_in_plot: s.total_individuals_in_plot,
            presence_in_zones: Array.from(s.presence_in_zones),
        }));

        return {
            sampling_plot_id: plotId,
            cycle_number: cycleNumber,
            sampling_plot_status: 'inactive',
            startDate: plot.start_date
                ? new Date(plot.start_date).toISOString().slice(0, 10)
                : '',
            endDate: endDate.toISOString().slice(0, 10),
            globalMetrics: { indices: globalIndices, counts: globalCounts },
            global_species_summary,
            zonesDetails,
        };
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

        if (status) qb.andWhere('p.sampling_plot_status = :status', { status });
        if (cursor) qb.andWhere('p.sampling_plot_id < :cursor', { cursor });

        const plots = await qb.getMany();

        return {
            data: plots.map((p) => this.toResponse(p)),
            meta: {
                nextCursor:
                    plots.length === take ? plots[plots.length - 1].sampling_plot_id : null,
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

        return this.findPlotForUser(plotId, userId).then((p) => this.toResponse(p));
    }

    async updateStatus(
        plotId: number,
        userId: number,
        dto: UpdateProjectStatusDto,
    ): Promise<PlotResponseDto> {
        const plot = await this.findPlotForUser(plotId, userId);

        const user = await this.userRepo.findOne({
            where: { user_id: userId },
            select: ['user_id', 'user_password'],
        });
        if (!user) throw new NotFoundException('Usuario no encontrado.');

        const isValid = await bcrypt.compare(dto.password, user.user_password);
        if (!isValid) {
            throw new UnauthorizedException(
                'La contraseña ingresada para confirmar el cambio de estatus es incorrecta.',
            );
        }

        if (
            plot.sampling_plot_status === PlotStatus.INACTIVE &&
            dto.samplingPlotStatus === PlotStatus.ACTIVE
        ) {
            // reactivar: avanzar ciclo
            await this.plotRepo.update(plotId, {
                sampling_plot_status: PlotStatus.ACTIVE,
                current_cycle_number: plot.current_cycle_number + 1,
                end_date: null,
            });
        } else if (dto.samplingPlotStatus === PlotStatus.INACTIVE) {
            // validar sub-áreas antes de cerrar
            const zonesSum = await this.zoneRepo
                .createQueryBuilder('z')
                .select('SUM(z.sub_area)', 'total')
                .where('z.sampling_plot_id = :plotId', { plotId })
                .andWhere('z.cycle_number = :cycle', { cycle: plot.current_cycle_number })
                .getRawOne();

            if (Number(zonesSum?.total ?? 0) > Number(plot.total_area)) {
                throw new UnprocessableEntityException(
                    'La sub-área ingresada excede el área total disponible de la parcela para el ciclo actual.',
                );
            }

            const endDate = new Date();

            await this.plotRepo.update(plotId, {
                sampling_plot_status: PlotStatus.INACTIVE,
                end_date: endDate,
            });

            // persistir snapshot inmutable del ciclo en MongoDB
            const snapshot = await this.buildActivityCycleSnapshot(plot, endDate);
            await this.activityCycleModel.create(snapshot);
        } else {
            await this.plotRepo.update(plotId, {
                sampling_plot_status: dto.samplingPlotStatus,
            });
        }

        return this.findPlotForUser(plotId, userId).then((p) => this.toResponse(p));
    }

    async remove(plotId: number, userId: number): Promise<void> {
        await this.findPlotForUser(plotId, userId);

        await this.dataSource.transaction(async (manager) => {
            const zones = await manager.find(StudyZone, {
                where: { sampling_plot_id: plotId },
            });
            const zoneIds = zones.map((z) => z.study_zone_id);

            if (zoneIds.length > 0) {
                const speciesZones = await manager
                    .createQueryBuilder(SpeciesZone, 'sz')
                    .where('sz.study_zone_id IN (:...zoneIds)', { zoneIds })
                    .getMany();

                const speciesIds = [...new Set(speciesZones.map((sz) => sz.species_id))];

                await manager.delete(SpeciesZone, { study_zone_id: In(zoneIds) });
                await manager.delete(StudyZone, { sampling_plot_id: plotId });

                for (const sId of speciesIds) {
                    const count = await manager.count(SpeciesZone, { where: { species_id: sId } });
                    if (count === 0) await manager.delete(Species, { species_id: sId });
                }
            }

            await manager.delete(SamplingPlot, { sampling_plot_id: plotId });
        });
    }
}