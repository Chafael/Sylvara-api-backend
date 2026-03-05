import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { StudyZone } from '../../common/entities/study-zone.entity';
import { SamplingPlot } from '../../common/entities/sampling-plot.entity';
import { SamplingPlot as MongoSamplingPlot, SamplingPlotDocument } from '../projects/schemas/sampling-plot.schema';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { ZoneResponseDto } from './dto/zone-response.dto';

@Injectable()
export class ZonesService {
    constructor(
        @InjectRepository(StudyZone)
        private readonly zoneRepository: Repository<StudyZone>,

        @InjectRepository(SamplingPlot)
        private readonly plotRepository: Repository<SamplingPlot>,

        @InjectModel(MongoSamplingPlot.name)
        private readonly mongoPlotModel: Model<SamplingPlotDocument>,
    ) { }

    private toResponse(zone: StudyZone): ZoneResponseDto {
        return {
            id: zone.study_zone_id,
            name: zone.name_study_zone,
            subArea: Number(zone.sub_area),
            unitId: zone.unit_id,
            unitName: zone.unitMeasurement?.unit_name ?? '',
            cycleNumber: zone.cycle_number,
        };
    }

    // verifica que la parcela exista y pertenezca al usuario
    private async verifyPlot(plotId: number, userId: number): Promise<SamplingPlot> {
        const plot = await this.plotRepository.findOne({
            where: { sampling_plot_id: plotId, user_id: userId },
        });
        if (!plot) throw new NotFoundException(`Parcela ${plotId} no encontrada.`);
        return plot;
    }

    // verifica que la zona pertenezca a la parcela del usuario
    private async verifyZone(zoneId: number, plotId: number, userId: number): Promise<StudyZone> {
        const zone = await this.zoneRepository
            .createQueryBuilder('z')
            .leftJoinAndSelect('z.unitMeasurement', 'um')
            .innerJoin('z.samplingPlot', 'sp')
            .where('z.study_zone_id = :zoneId', { zoneId })
            .andWhere('z.sampling_plot_id = :plotId', { plotId })
            .andWhere('sp.user_id = :userId', { userId })
            .getOne();

        if (!zone) throw new ForbiddenException(`Zona ${zoneId} no encontrada o sin acceso.`);
        return zone;
    }

    async findAll(plotId: number, userId: number): Promise<{ currentCycle: number; zones: ZoneResponseDto[] }> {
        const plot = await this.verifyPlot(plotId, userId);
        const zones = await this.zoneRepository
            .createQueryBuilder('z')
            .leftJoinAndSelect('z.unitMeasurement', 'um')
            .where('z.sampling_plot_id = :plotId', { plotId })
            .getMany();
        return { currentCycle: plot.current_cycle_number, zones: zones.map(z => this.toResponse(z)) };
    }

    async create(plotId: number, userId: number, dto: CreateZoneDto): Promise<ZoneResponseDto> {
        const plot = await this.verifyPlot(plotId, userId);

        // INSERT en PostgreSQL con el ciclo activo de la parcela
        const zone = this.zoneRepository.create({
            sampling_plot_id: plotId,
            name_study_zone: dto.name,
            sub_area: dto.subArea,
            unit_id: dto.unitId,
            cycle_number: plot.current_cycle_number,
        });
        const saved = await this.zoneRepository.save(zone);

        // recarga con el join a unit_measurement para la respuesta
        const full = await this.zoneRepository.findOne({
            where: { study_zone_id: saved.study_zone_id },
            relations: ['unitMeasurement'],
        });

        // sincroniza el biodiversity_cache en MongoDB
        await this.mongoPlotModel.updateOne(
            { userId, _id: { $exists: true } },
            { $push: { zonesDetails: { zone_name: dto.name } } },
        ).exec().catch(() => null); // el sync de Mongo no bloquea si falla

        return this.toResponse(full!);
    }

    async update(zoneId: number, plotId: number, userId: number, dto: UpdateZoneDto): Promise<ZoneResponseDto> {
        await this.verifyZone(zoneId, plotId, userId);

        await this.zoneRepository.update(zoneId, {
            ...(dto.name && { name_study_zone: dto.name }),
            ...(dto.subArea && { sub_area: dto.subArea }),
            ...(dto.unitId && { unit_id: dto.unitId }),
        });

        const updated = await this.zoneRepository.findOne({
            where: { study_zone_id: zoneId },
            relations: ['unitMeasurement'],
        });

        return this.toResponse(updated!);
    }

    async remove(zoneId: number, plotId: number, userId: number): Promise<{ message: string }> {
        const zone = await this.verifyZone(zoneId, plotId, userId);

        await this.zoneRepository.delete({ study_zone_id: zoneId });

        // elimina la zona del cache de MongoDB
        await this.mongoPlotModel.updateOne(
            { userId },
            { $pull: { zonesDetails: { zone_name: zone.name_study_zone } } },
        ).exec().catch(() => null);

        return { message: 'Zona eliminada exitosamente.' };
    }
}
