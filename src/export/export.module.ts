import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';

import { BigQueryService } from './bigquery.service';
import { ReportDataService } from './services/report-data.service';
import { ExportController } from './export.controller';

import { SamplingPlot } from '../common/entities/sampling-plot.entity';
import { UnitMeasurement } from '../common/entities/unit-measurement.entity';
import { User } from '../auth/entities/user.entity';
import { SamplingPlot as MongoPlot, SamplingPlotSchema } from '../bio-core/projects/schemas/sampling-plot.schema';

@Module({
    imports: [
        TypeOrmModule.forFeature([SamplingPlot, UnitMeasurement, User]),
        MongooseModule.forFeature([{ name: MongoPlot.name, schema: SamplingPlotSchema }]),
    ],
    controllers: [ExportController],
    providers: [BigQueryService, ReportDataService],
    exports: [BigQueryService, ReportDataService],
})
export class ExportModule { }

