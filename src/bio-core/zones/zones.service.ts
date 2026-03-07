import {
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnprocessableEntityException,
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
import {
    ZoneResponseDto,
    ZonesResponseDto,
    BiodiversityIndicesDto,
    BiodiversityCountsDto,
} from './dto/zone-response.dto';

@Injectable()
export class ZonesService {
    constructor(
        @InjectRepository(StudyZone)
        private readonly zoneRepository: Repository<StudyZone>,

        @InjectRepository(SamplingPlot)
        private readonly plotRepository: Repository<SamplingPlot>,

        @InjectModel(MongoSamplingPlot.name)
        private readonly mongoPlotModel: Model<SamplingPlotDocument>,
    ) {}

    private toZoneResponse(zone: StudyZone, mongoZone?: any): ZoneResponseDto {
        return {
            studyZoneId: zone.study_zone_id,
            nameStudyZone: zone.name_study_zone,
            subArea: Number(zone.sub_area),
            unitId: zone.unit_id,
            unitName: zone.unitMeasurement?.unit_name ?? '',
            cycleNumber: zone.cycle_number,
            indices: {
                shannon: mongoZone?.indices?.shannon ?? 0,
                simpson: mongoZone?.indices?.simpson ?? 0,
                margalef: mongoZone?.indices?.margalef ?? 0,
                pielou: mongoZone?.indices?.pielou ?? 0,
            },
            counts: {
                speciesRichness: mongoZone?.riqueza ?? 0,
                totalIndividuals: mongoZone?.total_individuos ?? 0,
            },
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

    private async validateSubArea(plotId: number, cycle: number, totalArea: number, newSubArea: number, excludeZoneId?: number): Promise<void> {
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
            throw new UnprocessableEntityException('La sub-área ingresada excede el área total disponible de la parcela para el ciclo actual.');
        }
    }

    async findAll(plotId: number, userId: number): Promise<ZonesResponseDto> {
        const plot = await this.verifyPlot(plotId, userId);

        const zones = await this.zoneRepository
            .createQueryBuilder('z')
            .leftJoinAndSelect('z.unitMeasurement', 'um')
            .where('z.sampling_plot_id = :plotId', { plotId })
            .andWhere('z.cycle_number = :cycle', { cycle: plot.current_cycle_number })
            .getMany();

        const mongoDoc = await this.mongoPlotModel
            .findOne({ userId, _id: { $exists: true } })
            .lean()
            .exec();

        const mongoZones: any[] = (mongoDoc as any)?.zonesDetails ?? [];

        const globalIndices: BiodiversityIndicesDto = (mongoDoc as any)?.globalMetrics?.indices ?? { shannon: 0, simpson: 0, margalef: 0, pielou: 0 };
        const globalCounts: BiodiversityCountsDto = {
            speciesRichness: (mongoDoc as any)?.globalMetrics?.counts?.riqueza ?? 0,
            totalIndividuals: (mongoDoc as any)?.globalMetrics?.counts?.total_individuos ?? 0,
        };

        return {
            samplingPlotId: plotId,
            cycleNumber: plot.current_cycle_number,
            globalMetrics: {
                indices: globalIndices,
                counts: globalCounts,
            },
            zones: zones.map(z => {
                const mongoZone = mongoZones.find((mz: any) => mz.zone_name === z.name_study_zone);
                return this.toZoneResponse(z, mongoZone);
            }),
        };
    }

    async create(plotId: number, userId: number, dto: CreateZoneDto): Promise<ZoneResponseDto> {
        const plot = await this.verifyPlot(plotId, userId);

        await this.validateSubArea(plotId, plot.current_cycle_number, Number(plot.total_area), dto.subArea);

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

        await this.mongoPlotModel.updateOne(
            { userId, _id: { $exists: true } },
            { $push: { zonesDetails: { zone_name: dto.nameStudyZone } } },
        ).exec().catch(() => null);

        return this.toZoneResponse(full!);
    }

    async update(zoneId: number, plotId: number, userId: number, dto: UpdateZoneDto): Promise<ZoneResponseDto> {
        const zone = await this.verifyZone(zoneId, plotId, userId);
        const plot = await this.verifyPlot(plotId, userId);

        if (dto.subArea !== undefined) {
            await this.validateSubArea(plotId, zone.cycle_number, Number(plot.total_area), dto.subArea, zoneId);
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

        const mongoDoc = await this.mongoPlotModel.findOne({ userId }).lean().exec();
        const mongoZones: any[] = (mongoDoc as any)?.zonesDetails ?? [];
        const mongoZone = mongoZones.find((mz: any) => mz.zone_name === updated!.name_study_zone);

        return this.toZoneResponse(updated!, mongoZone);
    }

    async remove(zoneId: number, plotId: number, userId: number): Promise<void> {
        const zone = await this.verifyZone(zoneId, plotId, userId);

        await this.zoneRepository.delete({ study_zone_id: zoneId });

        await this.mongoPlotModel.updateOne(
            { userId },
            { $pull: { zonesDetails: { zone_name: zone.name_study_zone } } },
        ).exec().catch(() => null);
    }
}