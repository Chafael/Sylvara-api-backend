import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';

import { StudyZone } from '../../common/entities/study-zone.entity';
import { SamplingPlot } from '../../common/entities/sampling-plot.entity';
import { SpeciesZone } from '../../common/entities/species-zone.entity';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import {
    ZoneResponseDto,
    ZonesResponseDto,
    BiodiversityIndicesDto,
    BiodiversityCountsDto,
} from './dto/zone-response.dto';
import { BiodiversityService } from '../biodiversity/biodiversity.service';
import { BiodiversityCache } from '../projects/schemas/biodiversity-cache.schema';

@Injectable()
export class ZonesService {
    constructor(
        @InjectRepository(StudyZone)
        private readonly zoneRepository: Repository<StudyZone>,

        @InjectRepository(SamplingPlot)
        private readonly plotRepository: Repository<SamplingPlot>,

        @InjectRepository(SpeciesZone)
        private readonly speciesZoneRepository: Repository<SpeciesZone>,

        @InjectModel(BiodiversityCache.name)
        private readonly cacheModel: Model<BiodiversityCache>,

        private readonly biodiversityService: BiodiversityService,
    ) {}

    private computeIndices(speciesZones: SpeciesZone[]): { indices: BiodiversityIndicesDto; counts: BiodiversityCountsDto } {
        const totalIndividuals = speciesZones.reduce((sum, sz) => sum + sz.individual_count, 0);
        const speciesRichness = speciesZones.length;

        const shannon = speciesZones.reduce((sum, sz) => {
            const p = sz.individual_count / (totalIndividuals || 1);
            return sum + (p > 0 ? -p * Math.log(p) : 0);
        }, 0);

        const simpson = totalIndividuals > 1
            ? 1 - speciesZones.reduce((sum, sz) =>
                sum + (sz.individual_count * (sz.individual_count - 1)), 0
            ) / (totalIndividuals * (totalIndividuals - 1))
            : 0;

        const margalef = totalIndividuals > 1
            ? (speciesRichness - 1) / Math.log(totalIndividuals)
            : 0;

        const pielou = speciesRichness > 1 ? shannon / Math.log(speciesRichness) : 0;

        return {
            indices: { shannon, simpson, margalef, pielou },
            counts: { speciesRichness, totalIndividuals },
        };
    }

    private async toZoneResponse(zone: StudyZone): Promise<ZoneResponseDto> {
        const speciesZones = await this.speciesZoneRepository.find({
            where: { study_zone_id: zone.study_zone_id },
        });

        const { indices, counts } = this.computeIndices(speciesZones);

        return {
            studyZoneId: zone.study_zone_id,
            nameStudyZone: zone.name_study_zone,
            subArea: Number(zone.sub_area),
            unitId: zone.unit_id,
            unitName: zone.unitMeasurement?.unit_name ?? '',
            cycleNumber: zone.cycle_number,
            indices,
            counts,
        };
    }

    private async verifyPlot(plotId: number, userId: number): Promise<SamplingPlot> {
        const plot = await this.plotRepository.findOne({
            where: { sampling_plot_id: plotId, user_id: userId },
        });
        if (!plot) throw new NotFoundException('No existe un proyecto con el ID especificado.');
        return plot;
    }

    private async verifyZone(zoneId: number, plotId: number, userId: number): Promise<StudyZone> {
        const zone = await this.zoneRepository
            .createQueryBuilder('z')
            .leftJoinAndSelect('z.unitMeasurement', 'um')
            .innerJoin('z.samplingPlot', 'sp')
            .where('z.study_zone_id = :zoneId', { zoneId })
            .andWhere('z.sampling_plot_id = :plotId', { plotId })
            .andWhere('sp.user_id = :userId', { userId })
            .getOne();

        if (!zone) throw new NotFoundException('No existe una zona con el ID especificado dentro de este proyecto.');
        return zone;
    }

    private async validateSubArea(
        plotId: number,
        cycle: number,
        totalArea: number,
        newSubArea: number,
        excludeZoneId?: number,
    ): Promise<void> {
        const qb = this.zoneRepository
            .createQueryBuilder('z')
            .select('SUM(z.sub_area)', 'total')
            .where('z.sampling_plot_id = :plotId', { plotId })
            .andWhere('z.cycle_number = :cycle', { cycle });

        if (excludeZoneId) {
            qb.andWhere('z.study_zone_id != :excludeZoneId', { excludeZoneId });
        }

        const result = await qb.getRawOne();
        const currentSum = Number(result?.total ?? 0);

        if (currentSum + newSubArea > totalArea) {
            throw new UnprocessableEntityException(
                'La sub-área ingresada excede el área total disponible de la parcela para el ciclo actual.',
            );
        }
    }

    async findAll(plotId: number, userId: number): Promise<ZonesResponseDto> {
        const plot = await this.verifyPlot(plotId, userId);

        // 1. Intentar leer desde caché de MongoDB
        const cached = await this.cacheModel.findOne({
            sampling_plot_id: plotId,
            cycle_number: plot.current_cycle_number,
        }).lean();

        if (cached) {
            // Traer zonas de PG solo para subArea, unitId y unitName (datos que el caché no guarda)
            const zones = await this.zoneRepository
                .createQueryBuilder('z')
                .leftJoinAndSelect('z.unitMeasurement', 'um')
                .where('z.sampling_plot_id = :plotId', { plotId })
                .andWhere('z.cycle_number = :cycle', { cycle: plot.current_cycle_number })
                .getMany();

            const zoneMap = new Map(zones.map(z => [z.study_zone_id, z]));

            const zonesFromCache: ZoneResponseDto[] = cached.zonesDetails.map(detail => {
                const pgZone = zoneMap.get(detail.study_zone_id);
                return {
                    studyZoneId: detail.study_zone_id,
                    nameStudyZone: detail.name_study_zone,
                    subArea: pgZone ? Number(pgZone.sub_area) : 0,
                    unitId: pgZone?.unit_id ?? 0,
                    unitName: pgZone?.unitMeasurement?.unit_name ?? '',
                    cycleNumber: plot.current_cycle_number,
                    indices: {
                        shannon: detail.indices.shannon,
                        simpson: detail.indices.simpson,
                        margalef: detail.indices.margalef,
                        pielou: detail.indices.pielou,
                    },
                    counts: {
                        speciesRichness: detail.counts.species_richness,
                        totalIndividuals: detail.counts.total_individuals,
                    },
                };
            });

            return {
                samplingPlotId: plotId,
                cycleNumber: plot.current_cycle_number,
                globalMetrics: {
                    indices: {
                        shannon: cached.globalMetrics.indices.shannon,
                        simpson: cached.globalMetrics.indices.simpson,
                        margalef: cached.globalMetrics.indices.margalef,
                        pielou: cached.globalMetrics.indices.pielou,
                    },
                    counts: {
                        speciesRichness: cached.globalMetrics.counts.species_richness,
                        totalIndividuals: cached.globalMetrics.counts.total_individuals,
                    },
                },
                zones: zonesFromCache,
            };
        }

        // 2. Fallback: cálculo en vivo si no hay caché aún (ciclo nuevo sin especies registradas)
        const zones = await this.zoneRepository
            .createQueryBuilder('z')
            .leftJoinAndSelect('z.unitMeasurement', 'um')
            .where('z.sampling_plot_id = :plotId', { plotId })
            .andWhere('z.cycle_number = :cycle', { cycle: plot.current_cycle_number })
            .getMany();

        const zonesResponses = await Promise.all(zones.map(z => this.toZoneResponse(z)));

        const allZoneIds = zones.map(z => z.study_zone_id);
        const allSpeciesZones = allZoneIds.length > 0
            ? await this.speciesZoneRepository
                .createQueryBuilder('sz')
                .where('sz.study_zone_id IN (:...ids)', { ids: allZoneIds })
                .andWhere('sz.cycle_number = :cycle', { cycle: plot.current_cycle_number })
                .getMany()
            : [];

        const { indices: globalIndices, counts: globalCounts } = this.computeIndices(allSpeciesZones);

        return {
            samplingPlotId: plotId,
            cycleNumber: plot.current_cycle_number,
            globalMetrics: { indices: globalIndices, counts: globalCounts },
            zones: zonesResponses,
        };
    }

    async create(plotId: number, userId: number, dto: CreateZoneDto): Promise<ZoneResponseDto> {
        const plot = await this.verifyPlot(plotId, userId);

        if (dto.unitId !== plot.unit_id) {
            throw new UnprocessableEntityException(
                `La unidad de la zona debe coincidir con la unidad del proyecto (unitId: ${plot.unit_id}).`,
            );
        }

        await this.validateSubArea(
            plotId,
            plot.current_cycle_number,
            Number(plot.total_area),
            dto.subArea,
        );

        const zone = this.zoneRepository.create({
            sampling_plot_id: plotId,
            name_study_zone: dto.nameStudyZone,
            sub_area: dto.subArea,
            unit_id: dto.unitId,
            cycle_number: plot.current_cycle_number,
        });
        const saved = await this.zoneRepository.save(zone);

        const full = await this.zoneRepository.findOne({
            where: { study_zone_id: saved.study_zone_id },
            relations: ['unitMeasurement'],
        });

        await this.biodiversityService.recalculateForPlot(plotId, plot.current_cycle_number);

        return this.toZoneResponse(full!);
    }

    async update(
        zoneId: number,
        plotId: number,
        userId: number,
        dto: UpdateZoneDto,
    ): Promise<ZoneResponseDto> {
        const zone = await this.verifyZone(zoneId, plotId, userId);
        const plot = await this.verifyPlot(plotId, userId);

        if (dto.unitId !== undefined && dto.unitId !== plot.unit_id) {
            throw new UnprocessableEntityException(
                `La unidad de la zona debe coincidir con la unidad del proyecto (unitId: ${plot.unit_id}).`,
            );
        }

        if (dto.subArea !== undefined) {
            await this.validateSubArea(
                plotId,
                zone.cycle_number,
                Number(plot.total_area),
                dto.subArea,
                zoneId,
            );
        }

        await this.zoneRepository.update(zoneId, {
            ...(dto.nameStudyZone && { name_study_zone: dto.nameStudyZone }),
            ...(dto.subArea !== undefined && { sub_area: dto.subArea }),
            ...(dto.unitId !== undefined && { unit_id: dto.unitId }),
        });

        const updated = await this.zoneRepository.findOne({
            where: { study_zone_id: zoneId },
            relations: ['unitMeasurement'],
        });

        await this.biodiversityService.recalculateForPlot(plotId, zone.cycle_number);

        return this.toZoneResponse(updated!);
    }

    async remove(zoneId: number, plotId: number, userId: number): Promise<void> {
        const zone = await this.verifyZone(zoneId, plotId, userId);
        await this.zoneRepository.delete({ study_zone_id: zoneId });
        await this.biodiversityService.recalculateForPlot(plotId, zone.cycle_number);
    }
}