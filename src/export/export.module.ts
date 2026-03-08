import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BigQueryService } from './bigquery.service';
import { ReportDataService } from './services/report-data.service';
import { ExportController } from './export.controller';

import { SamplingPlot } from '../common/entities/sampling-plot.entity';
import { UnitMeasurement } from '../common/entities/unit-measurement.entity';
import { User } from '../auth/entities/user.entity';
import { StudyZone } from '../common/entities/study-zone.entity';
import { SpeciesZone } from '../common/entities/species-zone.entity';
import { Species } from '../common/entities/species.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([SamplingPlot, UnitMeasurement, User, StudyZone, SpeciesZone, Species]),
    ],
    controllers: [ExportController],
    providers: [BigQueryService, ReportDataService],
    exports: [BigQueryService, ReportDataService],
})
export class ExportModule {}