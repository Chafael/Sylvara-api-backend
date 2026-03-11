import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';

import { SamplingPlot } from '../../common/entities/sampling-plot.entity';
import { User } from '../../auth/entities/user.entity';
import {
    BiodiversityHistory,
    BiodiversityHistoryDocument,
} from '../../bio-core/projects/schemas/biodiversity-history.schema';
import { ReportDataResponseDto, ZoneBiodiversityDto } from '../dto/report-data-response.dto';

@Injectable()
export class ReportDataService {
    constructor(
        @InjectRepository(SamplingPlot)
        private readonly plotRepo: Repository<SamplingPlot>,

        @InjectRepository(User)
        private readonly userRepo: Repository<User>,

        @InjectModel(BiodiversityHistory.name)
        private readonly historyModel: Model<BiodiversityHistoryDocument>,
    ) {}

    async getReportData(plotId: number, userId: number): Promise<ReportDataResponseDto> {
        // ── 1. Metadatos del proyecto y del investigador (PostgreSQL) ──────────
        const plot = await this.plotRepo.findOne({
            where: { sampling_plot_id: plotId, user_id: userId },
        });
        if (!plot) throw new NotFoundException('Parcela no encontrada.');

        const user = await this.userRepo.findOne({ where: { user_id: userId } });
        if (!user) throw new NotFoundException('Usuario no encontrado.');

        // ── 2. Snapshot más reciente del ciclo activo (MongoDB) ───────────────
        const snapshot = await this.historyModel
            .findOne({
                sampling_plot_id: plotId,
                cycle_number: plot.current_cycle_number,
            })
            .sort({ timestamp: -1 })
            .lean()
            .exec();

        if (!snapshot) throw new NotFoundException('No existe un historial de biodiversidad para esta parcela. Registra al menos una especie para generar el reporte.');

        // ── 3. Mapear zonesDetails desde el snapshot de MongoDB ───────────────
        const zonesDetails: ZoneBiodiversityDto[] = (snapshot.zonesDetails ?? []).map((zone) => ({
            zoneName: zone.name_study_zone,
            riqueza: zone.counts?.species_richness ?? 0,
            totalIndividuos: zone.counts?.total_individuals ?? 0,
            indices: {
                shannon: zone.indices?.shannon ?? 0,
                simpson: zone.indices?.simpson ?? 0,
                margalef: zone.indices?.margalef ?? 0,
                pielou: zone.indices?.pielou ?? 0,
            },
            speciesRecords: (zone.speciesRecords ?? []).map((sr) => ({
                speciesName: sr.species_name,
                commonName: '',
                functionalTypeName: sr.functional_type_name,
                individualCount: sr.individual_count,
                heightMin: sr.height_stratum_min ?? 0,
                heightMax: sr.height_stratum_max ?? 0,
            })),
        }));

        return {
            projectName: plot.sampling_plot_name,
            description: plot.description,
            totalArea: Number(plot.total_area),
            status: plot.sampling_plot_status,
            startDate: plot.start_date,
            endDate: plot.end_date,
            researcherName: user.user_name,
            researcherLastname: user.user_lastname,
            zonesDetails,
        };
    }
}