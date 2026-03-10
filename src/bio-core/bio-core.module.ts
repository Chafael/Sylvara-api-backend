import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';

import { SamplingPlot } from '../common/entities/sampling-plot.entity';
import { StudyZone } from '../common/entities/study-zone.entity';
import { Species } from '../common/entities/species.entity';
import { SpeciesZone } from '../common/entities/species-zone.entity';
import { FunctionalType } from '../common/entities/functional-type.entity';
import { UnitMeasurement } from '../common/entities/unit-measurement.entity';
import { User } from '../auth/entities/user.entity';

import {
    BiodiversityCache,
    BiodiversityCacheSchema,
} from './projects/schemas/biodiversity-cache.schema';
import {
    BiodiversityHistory,
    BiodiversityHistorySchema,
} from './projects/schemas/biodiversity-history.schema';
import {
    ActivityCycle,
    ActivityCycleSchema,
} from './projects/schemas/activity-cycle.schema';

import { ProjectsService } from './projects/projects.service';
import { ProjectsController } from './projects/projects.controller';
import { ZonesService } from './zones/zones.service';
import { ZonesController } from './zones/zones.controller';
import { SpeciesService } from './species/species.service';
import { SpeciesController } from './species/species.controller';
import { BiodiversityService } from './biodiversity/biodiversity.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            SamplingPlot,
            StudyZone,
            Species,
            SpeciesZone,
            FunctionalType,
            UnitMeasurement,
            User,
        ]),
        MongooseModule.forFeature([
            { name: BiodiversityCache.name, schema: BiodiversityCacheSchema },
            { name: BiodiversityHistory.name, schema: BiodiversityHistorySchema },
            { name: ActivityCycle.name, schema: ActivityCycleSchema },
        ]),
    ],
    controllers: [ProjectsController, ZonesController, SpeciesController],
    providers: [ProjectsService, ZonesService, SpeciesService, BiodiversityService],
    exports: [ProjectsService, ZonesService, SpeciesService, BiodiversityService],
})
export class BioCoreModule {}