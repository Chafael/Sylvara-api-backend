import {
    ConflictException,
    HttpStatus,
    Injectable,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Species } from '../../common/entities/species.entity';
import { SpeciesZone } from '../../common/entities/species-zone.entity';
import { StudyZone } from '../../common/entities/study-zone.entity';
import { SamplingPlot } from '../../common/entities/sampling-plot.entity';

import { CreateSpeciesDto } from './dto/create-species.dto';
import { UpdateSpeciesDto } from './dto/update-species.dto';
import { SpeciesZoneResponseDto } from './dto/species-response.dto';
import { SpeciesCatalogItemDto } from './dto/catalog-item.dto';
import { SpeciesDuplicateResponseDto } from './dto/species-duplicate-response.dto';
import { PaginatedSpeciesDto } from './dto/paginated-species.dto';
import { BiodiversityService } from '../biodiversity/biodiversity.service';
import { PROJECT_CONSTANTS } from '../../common/constants/project-constants';

// Redundante: Usamos PROJECT_CONSTANTS.DEFAULT_UNIT_ID

@Injectable()
export class SpeciesService {
    constructor(
        @InjectRepository(Species)
        private readonly speciesRepo: Repository<Species>,

        @InjectRepository(SpeciesZone)
        private readonly speciesZoneRepo: Repository<SpeciesZone>,

        @InjectRepository(StudyZone)
        private readonly zoneRepo: Repository<StudyZone>,

        @InjectRepository(SamplingPlot)
        private readonly plotRepo: Repository<SamplingPlot>,

        private readonly dataSource: DataSource,

        private readonly biodiversityService: BiodiversityService,
    ) {}

    private toResponse(sz: SpeciesZone): SpeciesZoneResponseDto {
        return {
            speciesZoneId: sz.species_zone_id,
            speciesId: sz.species_id,
            speciesName: sz.species?.species_name ?? '',
            speciesImageUrl: sz.species?.species_image_url ?? null,
            functionalTypeId: sz.species?.functional_type_id ?? 0,
            functionalTypeName: sz.species?.functionalType?.functional_type_name ?? '',
            individualCount: sz.individual_count,
            heightStratumMin: sz.height_stratum_min !== null ? Number(sz.height_stratum_min) : null,
            heightStratumMax: sz.height_stratum_max !== null ? Number(sz.height_stratum_max) : null,
            unitId: sz.unit_id,
            unitName: sz.unitMeasurement?.unit_name ?? '',
            cycleNumber: sz.cycle_number,
        };
    }

    private async verifyZoneOwnership(zoneId: number, plotId: number, userId: number): Promise<StudyZone> {
        const zone = await this.zoneRepo
            .createQueryBuilder('z')
            .innerJoin('z.samplingPlot', 'sp')
            .where('z.study_zone_id = :zoneId', { zoneId })
            .andWhere('z.sampling_plot_id = :plotId', { plotId })
            .andWhere('sp.user_id = :userId', { userId })
            .getOne();
        if (!zone) throw new NotFoundException('No existe una zona con el ID especificado dentro de este proyecto.');
        return zone;
    }

    private validateHeightStrata(min: number, max: number): void {
        if (min >= max) {
            throw new UnprocessableEntityException(
                'La altura mínima del estrato no puede ser mayor o igual a la altura máxima.',
            );
        }
    }

    async findAll(
        zoneId: number,
        plotId: number,
        userId: number,
        cursor?: number,
        limit = 20,
    ): Promise<PaginatedSpeciesDto<SpeciesZoneResponseDto>> {
        await this.verifyZoneOwnership(zoneId, plotId, userId);

        const take = Math.min(limit, 50);

        const qb = this.speciesZoneRepo
            .createQueryBuilder('sz')
            .leftJoinAndSelect('sz.species', 's')
            .leftJoinAndSelect('s.functionalType', 'ft')
            .leftJoinAndSelect('sz.unitMeasurement', 'um')
            .where('sz.study_zone_id = :zoneId', { zoneId })
            .orderBy('sz.species_zone_id', 'DESC')
            .take(take);

        if (cursor) {
            qb.andWhere('sz.species_zone_id < :cursor', { cursor });
        }

        const records = await qb.getMany();

        return {
            data: records.map(r => this.toResponse(r)),
            meta: {
                nextCursor: records.length === take ? records[records.length - 1].species_zone_id : null,
                limit: records.length,
            },
        };
    }

    async create(
        zoneId: number,
        plotId: number,
        userId: number,
        dto: CreateSpeciesDto,
    ): Promise<{ status: number; data: SpeciesZoneResponseDto | SpeciesDuplicateResponseDto }> {
        const zone = await this.verifyZoneOwnership(zoneId, plotId, userId);

        this.validateHeightStrata(dto.heightStratumMin, dto.heightStratumMax);

        const existingInProject = await this.speciesRepo
            .createQueryBuilder('s')
            .innerJoin('s.speciesZones', 'sz')
            .innerJoin('sz.studyZone', 'z')
            .where('LOWER(s.species_name) = LOWER(:name)', { name: dto.speciesName })
            .andWhere('z.sampling_plot_id = :plotId', { plotId })
            .getOne();

        let speciesId: number;

        if (existingInProject) {
            speciesId = existingInProject.species_id;
            const inZone = await this.speciesZoneRepo.findOne({
                where: { species_id: speciesId, study_zone_id: zoneId },
                relations: ['species', 'unitMeasurement'],
            });
            if (inZone) {
                return {
                    status: HttpStatus.CONFLICT,
                    data: {
                        code: 'SPECIES_EXISTS_IN_ZONE',
                        message: `La especie ya está registrada en esta zona.`,
                        existingRecord: {
                            speciesZoneId: inZone.species_zone_id,
                            speciesId: inZone.species_id,
                            speciesName: inZone.species?.species_name ?? '',
                            speciesImageUrl: inZone.species?.species_image_url ?? null,
                            functionalTypeId: inZone.species?.functional_type_id ?? null,
                            functionalTypeName: null,
                            individualCount: inZone.individual_count,
                            heightStratumMin: inZone.height_stratum_min !== null ? Number(inZone.height_stratum_min) : null,
                            heightStratumMax: inZone.height_stratum_max !== null ? Number(inZone.height_stratum_max) : null,
                            unitName: inZone.unitMeasurement?.unit_name ?? null,
                        },
                    },
                };
            }
        } else {
            const created = this.speciesRepo.create({
                species_name: dto.speciesName,
                functional_type_id: dto.functionalTypeId,
                species_image_url: dto.speciesImageUrl ?? null,
            });
            const saved = await this.speciesRepo.save(created);
            speciesId = saved.species_id;
        }

        const link = this.speciesZoneRepo.create({
            study_zone_id: zoneId,
            species_id: speciesId,
            individual_count: dto.individualCount,
            height_stratum_min: dto.heightStratumMin,
            height_stratum_max: dto.heightStratumMax,
            unit_id: PROJECT_CONSTANTS.DEFAULT_UNIT_ID,
            cycle_number: zone.cycle_number,
        });
        const savedLink = await this.speciesZoneRepo.save(link);

        const full = await this.speciesZoneRepo.findOne({
            where: { species_zone_id: savedLink.species_zone_id },
            relations: ['species', 'species.functionalType', 'unitMeasurement'],
        });

        await this.biodiversityService.recalculateForZone(zoneId);

        return { status: HttpStatus.CREATED, data: this.toResponse(full!) };
    }

    async remove(
        speciesZoneId: number,
        zoneId: number,
        plotId: number,
        userId: number,
    ): Promise<void> {
        await this.verifyZoneOwnership(zoneId, plotId, userId);

        const sz = await this.speciesZoneRepo.findOne({
            where: { species_zone_id: speciesZoneId, study_zone_id: zoneId },
        });
        if (!sz) throw new NotFoundException('No existe un registro de especie con el ID especificado en esta zona.');

        await this.speciesZoneRepo.delete({ species_zone_id: speciesZoneId });

        const remaining = await this.speciesZoneRepo.count({
            where: { species_id: sz.species_id },
        });
        if (remaining === 0) await this.speciesRepo.delete({ species_id: sz.species_id });

        await this.biodiversityService.recalculateForZone(zoneId);
    }

    async update(
        speciesZoneId: number,
        zoneId: number,
        plotId: number,
        userId: number,
        dto: UpdateSpeciesDto,
    ): Promise<SpeciesZoneResponseDto> {
        await this.verifyZoneOwnership(zoneId, plotId, userId);

        const sz = await this.speciesZoneRepo.findOne({
            where: { species_zone_id: speciesZoneId, study_zone_id: zoneId },
        });
        if (!sz) throw new NotFoundException('No existe un registro de especie con el ID especificado en esta zona.');

        const currentMin = dto.heightStratumMin !== undefined ? dto.heightStratumMin : Number(sz.height_stratum_min);
        const currentMax = dto.heightStratumMax !== undefined ? dto.heightStratumMax : Number(sz.height_stratum_max);

        if (dto.heightStratumMin !== undefined || dto.heightStratumMax !== undefined) {
            this.validateHeightStrata(currentMin, currentMax);
        }

        await this.dataSource.transaction(async (manager) => {
            if (dto.speciesName || dto.speciesImageUrl !== undefined || dto.functionalTypeId) {
                await manager.update(Species, sz.species_id, {
                    ...(dto.speciesName && { species_name: dto.speciesName }),
                    ...(dto.speciesImageUrl !== undefined && { species_image_url: dto.speciesImageUrl }),
                    ...(dto.functionalTypeId && { functional_type_id: dto.functionalTypeId }),
                });
            }

            if (
                dto.individualCount !== undefined ||
                dto.heightStratumMin !== undefined ||
                dto.heightStratumMax !== undefined
            ) {
                await manager.update(SpeciesZone, speciesZoneId, {
                    ...(dto.individualCount !== undefined && { individual_count: dto.individualCount }),
                    ...(dto.heightStratumMin !== undefined && { height_stratum_min: dto.heightStratumMin }),
                    ...(dto.heightStratumMax !== undefined && { height_stratum_max: dto.heightStratumMax }),
                });
            }
        });

        const full = await this.speciesZoneRepo.findOne({
            where: { species_zone_id: speciesZoneId },
            relations: ['species', 'species.functionalType', 'unitMeasurement'],
        });

        await this.biodiversityService.recalculateForZone(zoneId);

        return this.toResponse(full!);
    }

    async getCatalog(
        plotId: number,
        zoneId: number,
        userId: number,
        cursor?: number,
        limit = 20,
    ): Promise<PaginatedSpeciesDto<SpeciesCatalogItemDto>> {
        await this.verifyZoneOwnership(zoneId, plotId, userId);

        const plot = await this.plotRepo.findOne({ where: { sampling_plot_id: plotId } });
        const currentCycle = plot?.current_cycle_number ?? 1;
        const take = Math.min(limit, 50);

        const qb = this.speciesZoneRepo
            .createQueryBuilder('sz')
            .select('s.species_id', 'speciesId')
            .addSelect('s.species_name', 'speciesName')
            .addSelect('s.species_image_url', 'speciesImageUrl')
            .addSelect('ft.functional_type_name', 'functionalTypeName')
            .addSelect('SUM(sz.individual_count)', 'totalIndividuals')
            .innerJoin('sz.species', 's')
            .innerJoin('s.functionalType', 'ft')
            .innerJoin('sz.studyZone', 'z')
            .where('z.sampling_plot_id = :plotId', { plotId })
            .andWhere('sz.cycle_number = :cycle', { cycle: currentCycle })
            .groupBy('s.species_id, s.species_name, s.species_image_url, ft.functional_type_name')
            .orderBy('s.species_id', 'DESC')
            .limit(take);

        if (cursor) {
            qb.having('s.species_id < :cursor', { cursor });
        }

        const rows = await qb.getRawMany();

        return {
            data: rows.map(r => ({
                speciesId: r.speciesId,
                speciesName: r.speciesName,
                speciesImageUrl: r.speciesImageUrl ?? null,
                functionalTypeName: r.functionalTypeName,
                totalIndividuals: Number(r.totalIndividuals),
            })),
            meta: {
                nextCursor: rows.length === take ? rows[rows.length - 1].speciesId : null,
                limit: rows.length,
            },
        };
    }
}