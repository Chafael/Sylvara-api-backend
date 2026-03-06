import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Species } from '../../common/entities/species.entity';
import { SpeciesZone } from '../../common/entities/species-zone.entity';
import { StudyZone } from '../../common/entities/study-zone.entity';
import { SamplingPlot } from '../../common/entities/sampling-plot.entity';
import { SamplingPlot as MongoPlot, SamplingPlotDocument } from '../projects/schemas/sampling-plot.schema';

import { CreateSpeciesDto } from './dto/create-species.dto';
import { UpdateSpeciesDto } from './dto/update-species.dto';
import { SpeciesZoneResponseDto } from './dto/species-response.dto';
import { CatalogItemDto } from './dto/catalog-item.dto';

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

        @InjectModel(MongoPlot.name)
        private readonly mongoPlotModel: Model<SamplingPlotDocument>,

        private readonly dataSource: DataSource,
    ) { }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private toResponse(sz: SpeciesZone): SpeciesZoneResponseDto {
        return {
            speciesZoneId: sz.species_zone_id,
            speciesId: sz.species_id,
            speciesName: sz.species?.species_name ?? '',
            imageUrl: sz.species?.species_image_url ?? null,
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
        if (!zone) throw new ForbiddenException('Zona no encontrada o sin acceso.');
        return zone;
    }

    // ─── Índices ecológicos ──────────────────────────────────────────────────

    private calcIndices(counts: number[]): { shannon: number; simpson: number; margalef: number; pielou: number } {
        const N = counts.reduce((a, b) => a + b, 0);
        const S = counts.length;
        if (N === 0 || S === 0) return { shannon: 0, simpson: 0, margalef: 0, pielou: 0 };

        let shannon = 0;
        let simpsonNum = 0;
        for (const ni of counts) {
            if (ni === 0) continue;
            const pi = ni / N;
            shannon -= pi * Math.log(pi);
            simpsonNum += ni * (ni - 1);
        }

        const simpson = N > 1 ? simpsonNum / (N * (N - 1)) : 0;
        const margalef = N > 1 ? (S - 1) / Math.log(N) : 0;
        const pielou = S > 1 ? shannon / Math.log(S) : 0;

        return {
            shannon: parseFloat(shannon.toFixed(4)),
            simpson: parseFloat(simpson.toFixed(4)),
            margalef: parseFloat(margalef.toFixed(4)),
            pielou: parseFloat(pielou.toFixed(4)),
        };
    }

    // recalcula índices para la zona local, y calcula índices globales a nivel plot
    private async syncMongoIndices(plotId: number, zoneId: number, zoneName: string, userId: number): Promise<void> {
        try {
            // Zona local
            const localRecords = await this.speciesZoneRepo.find({ where: { study_zone_id: zoneId } });
            const localCounts = localRecords.map(r => r.individual_count);
            const localIndices = this.calcIndices(localCounts);

            // Global plot
            const globalRecords = await this.speciesZoneRepo
                .createQueryBuilder('sz')
                .select('sz.species_id', 'speciesId')
                .addSelect('SUM(sz.individual_count)', 'total')
                .innerJoin('sz.studyZone', 'z')
                .where('z.sampling_plot_id = :plotId', { plotId })
                .groupBy('sz.species_id')
                .getRawMany();

            const globalCounts = globalRecords.map(r => Number(r.total));
            const globalIndices = this.calcIndices(globalCounts);
            const globalRiqueza = globalCounts.length;
            const globalTotalIndividuos = globalCounts.reduce((a, b) => a + b, 0);

            // Fetch plot for updating local zone correctly
            await this.mongoPlotModel.updateOne(
                { postgresId: plotId, 'zonesDetails.zone_name': zoneName },
                {
                    $set: {
                        'zonesDetails.$.indices.shannon': localIndices.shannon,
                        'zonesDetails.$.indices.simpson': localIndices.simpson,
                        'zonesDetails.$.indices.margalef': localIndices.margalef,
                        'zonesDetails.$.indices.pielou': localIndices.pielou,
                        'zonesDetails.$.total_individuos': localCounts.reduce((a, b) => a + b, 0),
                        'zonesDetails.$.riqueza': localCounts.length,
                        'globalMetrics': {
                            indices: globalIndices,
                            counts: { riqueza: globalRiqueza, total_individuos: globalTotalIndividuos }
                        }
                    },
                },
            ).exec();
        } catch (err) {
            // el sync de Mongo es no bloqueante
            console.error('Error syncing Mongo indices:', err);
        }
    }

    // ─── Listar especies de una zona ─────────────────────────────────────────

    async findAll(zoneId: number, plotId: number, userId: number): Promise<SpeciesZoneResponseDto[]> {
        await this.verifyZoneOwnership(zoneId, plotId, userId);

        const records = await this.speciesZoneRepo
            .createQueryBuilder('sz')
            .leftJoinAndSelect('sz.species', 's')
            .leftJoinAndSelect('s.functionalType', 'ft')
            .leftJoinAndSelect('sz.unitMeasurement', 'um')
            .where('sz.study_zone_id = :zoneId', { zoneId })
            .getMany();

        return records.map(r => this.toResponse(r));
    }

    // ─── Crear especie en zona (lógica de 3 pasos) ──────────────────────────

    async create(zoneId: number, plotId: number, userId: number, dto: CreateSpeciesDto): Promise<SpeciesZoneResponseDto> {
        const zone = await this.verifyZoneOwnership(zoneId, plotId, userId);

        if (dto.heightStratumMin >= dto.heightStratumMax) {
            throw new UnprocessableEntityException('El estrato de altura mínimo no puede ser mayor o igual al máximo.');
        }

        // Paso 1: busca si la especie ya existe en cualquier zona del proyecto
        const existing = await this.speciesRepo
            .createQueryBuilder('s')
            .innerJoin('species_zone', 'sz', 'sz.species_id = s.species_id')
            .innerJoin('studies_zones', 'z', 'z.study_zone_id = sz.study_zone_id')
            .where('z.sampling_plot_id = :plotId', { plotId })
            .andWhere('LOWER(s.species_name) = LOWER(:name)', { name: dto.speciesName })
            .getOne();

        // Paso 2: si no existe en el catálogo → crearla; si existe → reusar su ID
        let speciesId: number;
        let isExistingInCatalog = false;

        if (existing) {
            speciesId = existing.species_id;
            const inZone = await this.speciesZoneRepo.findOne({
                where: { species_id: speciesId, study_zone_id: zoneId },
            });
            if (inZone) throw new ConflictException('SPECIES_EXISTS_IN_ZONE');
            isExistingInCatalog = true;
        } else {
            const created = this.speciesRepo.create({
                species_name: dto.speciesName,
                functional_type_id: dto.functionalTypeId,
                species_image_url: dto.imageUrl ?? null,
            });
            const saved = await this.speciesRepo.save(created);
            speciesId = saved.species_id;
        }

        // registra el vínculo en species_zone con el ciclo activo de la zona
        const link = this.speciesZoneRepo.create({
            study_zone_id: zoneId,
            species_id: speciesId,
            individual_count: dto.individualCount,
            height_stratum_min: dto.heightStratumMin,
            height_stratum_max: dto.heightStratumMax,
            unit_id: 1, // Fixed value according to v1.4.0 contract
            cycle_number: zone.cycle_number,
        });
        const savedLink = await this.speciesZoneRepo.save(link);

        const full = await this.speciesZoneRepo.findOne({
            where: { species_zone_id: savedLink.species_zone_id },
            relations: ['species', 'species.functionalType', 'unitMeasurement'],
        });

        // Paso 3: recalcula Shannon y Simpson y actualiza MongoDB
        await this.syncMongoIndices(plotId, zoneId, zone.name_study_zone, userId);

        const responseObj = this.toResponse(full!);
        if (isExistingInCatalog) {
            (responseObj as any).code = 'SPECIES_EXISTS_IN_CATALOG';
        }
        return responseObj;
    }

    // ─── Eliminar especie de una zona ────────────────────────────────────────

    async remove(speciesZoneId: number, zoneId: number, plotId: number, userId: number): Promise<{ message: string }> {
        const zone = await this.verifyZoneOwnership(zoneId, plotId, userId);

        const sz = await this.speciesZoneRepo.findOne({
            where: { species_zone_id: speciesZoneId, study_zone_id: zoneId },
        });
        if (!sz) throw new NotFoundException('Registro de especie no encontrado.');

        await this.speciesZoneRepo.delete({ species_zone_id: speciesZoneId });

        // limpia especie huérfana si ya no tiene vínculos en ninguna zona
        const remaining = await this.speciesZoneRepo.count({ where: { species_id: sz.species_id } });
        if (remaining === 0) await this.speciesRepo.delete({ species_id: sz.species_id });

        // recalcula índices en Mongo después del borrado
        await this.syncMongoIndices(plotId, zoneId, zone.name_study_zone, userId);

        return { message: 'Especie eliminada de la zona exitosamente.' };
    }

    // ─── Edición inteligente (global y local) con transacción ───────────────

    async update(
        speciesZoneId: number,
        zoneId: number,
        plotId: number,
        userId: number,
        dto: UpdateSpeciesDto,
    ): Promise<SpeciesZoneResponseDto> {
        const zone = await this.verifyZoneOwnership(zoneId, plotId, userId);

        const sz = await this.speciesZoneRepo.findOne({
            where: { species_zone_id: speciesZoneId, study_zone_id: zoneId },
        });
        if (!sz) throw new NotFoundException('Registro de especie no encontrado.');

        // TRANSACCIÓN: actualiza datos globales (species) y locales (species_zone) de forma atómica
        await this.dataSource.transaction(async (manager) => {
            // campos globales → afectan species para todas las zonas del proyecto
            if (dto.speciesName || dto.imageUrl !== undefined || dto.functionalTypeId) {
                await manager.update(Species, sz.species_id, {
                    ...(dto.speciesName && { species_name: dto.speciesName }),
                    ...(dto.imageUrl !== undefined && { species_image_url: dto.imageUrl }),
                    ...(dto.functionalTypeId && { functional_type_id: dto.functionalTypeId }),
                });
            }

            // campos locales → solo el registro en species_zone de esta zona
            if (dto.individualCount || dto.heightMin !== undefined || dto.heightMax !== undefined) {
                await manager.update(SpeciesZone, speciesZoneId, {
                    ...(dto.individualCount !== undefined && { individual_count: dto.individualCount }),
                    ...(dto.heightMin !== undefined && { height_stratum_min: dto.heightMin }),
                    ...(dto.heightMax !== undefined && { height_stratum_max: dto.heightMax }),
                });
            }
        });

        const full = await this.speciesZoneRepo.findOne({
            where: { species_zone_id: speciesZoneId },
            relations: ['species', 'species.functionalType', 'unitMeasurement'],
        });

        // recalcula índices si cambió el conteo
        if (dto.individualCount !== undefined) {
            await this.syncMongoIndices(plotId, zoneId, zone.name_study_zone, userId);
        }

        return this.toResponse(full!);
    }

    // ─── Catálogo del proyecto ───────────────────────────────────────────────

    async getCatalog(plotId: number, zoneId: number, userId: number): Promise<CatalogItemDto[]> {
        await this.verifyZoneOwnership(zoneId, plotId, userId);

        const plot = await this.plotRepo.findOne({ where: { sampling_plot_id: plotId } });
        const currentCycle = plot?.current_cycle_number ?? 1;

        // SUM de individuos por especie en el ciclo activo de toda la parcela
        const rows = await this.speciesZoneRepo
            .createQueryBuilder('sz')
            .select('s.species_id', 'speciesId')
            .addSelect('s.species_name', 'speciesName')
            .addSelect('s.species_image_url', 'imageUrl')
            .addSelect('ft.functional_type_name', 'functionalTypeName')
            .addSelect('SUM(sz.individual_count)', 'totalIndividuals')
            .innerJoin('sz.species', 's')
            .innerJoin('s.functionalType', 'ft')
            .innerJoin('sz.studyZone', 'z')
            .where('z.sampling_plot_id = :plotId', { plotId })
            .andWhere('sz.cycle_number = :cycle', { cycle: currentCycle })
            .groupBy('s.species_id, s.species_name, s.species_image_url, ft.functional_type_name')
            .orderBy('s.species_id', 'DESC')
            .getRawMany();

        return rows.map(r => ({
            speciesId: r.speciesId,
            speciesName: r.speciesName,
            imageUrl: r.imageUrl ?? null,
            functionalTypeName: r.functionalTypeName,
            totalIndividuals: Number(r.totalIndividuals),
        }));
    }
}