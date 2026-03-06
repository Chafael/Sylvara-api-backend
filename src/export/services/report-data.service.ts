import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { SamplingPlot } from '../../common/entities/sampling-plot.entity';
import { User } from '../../auth/entities/user.entity';
import { SamplingPlot as MongoPlot, SamplingPlotDocument } from '../../bio-core/projects/schemas/sampling-plot.schema';
import { ReportDataResponseDto } from '../dto/report-data-response.dto';

@Injectable()
export class ReportDataService {
    constructor(
        @InjectRepository(SamplingPlot)
        private readonly plotRepo: Repository<SamplingPlot>,

        @InjectRepository(User)
        private readonly userRepo: Repository<User>,

        @InjectModel(MongoPlot.name)
        private readonly mongoPlotModel: Model<SamplingPlotDocument>,
    ) { }

    async getReportData(plotId: number, userId: number): Promise<ReportDataResponseDto> {
        // datos del proyecto desde PostgreSQL
        const plot = await this.plotRepo.findOne({
            where: { samplingPlotId: plotId, userId: userId },
        });
        if (!plot) throw new NotFoundException('Parcela no encontrada.');

        // datos del investigador desde PostgreSQL
        const user = await this.userRepo.findOne({ where: { user_id: userId } });
        if (!user) throw new NotFoundException('Usuario no encontrado.');

        // datos de biodiversidad desde MongoDB
        const mongoDoc = await this.mongoPlotModel
            .findOne({ userId })
            .lean()
            .exec();

        return {
            projectName: plot.samplingPlotName,
            description: plot.description,
            totalArea: Number(plot.totalArea),
            status: plot.samplingPlotStatus,
            startDate: plot.startDate,
            endDate: plot.endDate,

            researcherName: user.user_name,
            researcherLastname: user.user_lastname,

            zonesDetails: (mongoDoc as any)?.zonesDetails ?? [],
        };
    }
}
