import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Species } from '../../common/entities/species.entity';
import { SpeciesZone } from '../../common/entities/species-zone.entity';
import { StudyZone } from '../../common/entities/study-zone.entity';
import { SamplingPlot } from '../../common/entities/sampling-plot.entity';
import { SamplingPlot as MongoPlot, SamplingPlotDocument } from '../projects/schemas/sampling-plot.schema';

import { CreateSpeciesDto } from './dto/create-species.dto';
import { SpeciesZoneResponseDto } from './dto/species-response.dto';

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
            heightMin: sz.height_stratum_min !== null ? Number(sz.height_stratum_min) : null,
            heightMax: sz.height_stratum_max !== null ? Number(sz.height_stratum_max) : null,
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

    private calcIndices(counts: number[]): { shannon: number; simpson: number } {
        const N = counts.reduce((a, b) => a + b, 0);
        if (N === 0) return { shannon: 0, simpson: 0 };

        let shannon = 0;
        let simpsonNum = 0;
        for (const ni of counts) {
            if (ni === 0) continue;
            const pi = ni / N;
            shannon -= pi * Math.log(pi);
            simpsonNum += ni * (ni - 1);
        }
        return {
            shannon: parseFloat(shannon.toFixed(4)),
            simpson: parseFloat((N > 1 ? simpsonNum / (N * (N - 1)) : 0).toFixed(4)),
        };
    }

    // recalcula índices y los empuja al biodiversity_cache de MongoDB
    private async syncMongoIndices(zoneId: number, zoneName: string, userId: number): Promise<void> {
        try {
            const records = await this.speciesZoneRepo.find({ where: { study_zone_id: zoneId } });
            const counts = records.map(r => r.individual_count);
            const { shannon, simpson } = this.calcIndices(counts);

            await this.mongoPlotModel.updateOne(
                { userId, 'zonesDetails.zone_name': zoneName },
                {
                    $set: {
                        'zonesDetails.$.indices.shannon': shannon,
                        'zonesDetails.$.indices.simpson': simpson,
                        'zonesDetails.$.total_individuos': counts.reduce((a, b) => a + b, 0),
                        'zonesDetails.$.riqueza': records.length,
                    },
                },
            ).exec();
        } catch {
            // el sync de Mongo es no bloqueante
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
        if (existing) {
            speciesId = existing.species_id;
            const inZone = await this.speciesZoneRepo.findOne({
                where: { species_id: speciesId, study_zone_id: zoneId },
            });
            if (inZone) throw new ConflictException('La especie ya está registrada en esta zona.');
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
            height_stratum_min: dto.heightMin ?? null,
            height_stratum_max: dto.heightMax ?? null,
            unit_id: dto.unitId,
            cycle_number: zone.cycle_number,
        });
        const savedLink = await this.speciesZoneRepo.save(link);

        const full = await this.speciesZoneRepo.findOne({
            where: { species_zone_id: savedLink.species_zone_id },
            relations: ['species', 'species.functionalType', 'unitMeasurement'],
        });

        // Paso 3: recalcula Shannon y Simpson y actualiza MongoDB
        await this.syncMongoIndices(zoneId, zone.name_study_zone, userId);

        return this.toResponse(full!);
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
        await this.syncMongoIndices(zoneId, zone.name_study_zone, userId);

        return { message: 'Especie eliminada de la zona exitosamente.' };
    }
}
