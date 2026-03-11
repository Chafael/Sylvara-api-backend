// src/export/export.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';

import { BigQueryService } from './bigquery.service';
import { ReportDataService } from './services/report-data.service';
import { ExportController } from './export.controller';

import { SamplingPlot } from '../common/entities/sampling-plot.entity';
import { StudyZone } from '../common/entities/study-zone.entity';
import { SpeciesZone } from '../common/entities/species-zone.entity';
import { UnitMeasurement } from '../common/entities/unit-measurement.entity';
import { User } from '../auth/entities/user.entity';
import {
    BiodiversityHistory,
    BiodiversityHistorySchema,
} from '../bio-core/projects/schemas/biodiversity-history.schema';
@Module({
    imports: [
        TypeOrmModule.forFeature([
            SamplingPlot,
            StudyZone,
            SpeciesZone,
            UnitMeasurement,
            User,
        ]),
        MongooseModule.forFeature([
            { name: BiodiversityHistory.name, schema: BiodiversityHistorySchema },
        ]),
    ],
    controllers: [ExportController],
    providers: [BigQueryService, ReportDataService],
    exports: [BigQueryService, ReportDataService],
})
export class ExportModule {}