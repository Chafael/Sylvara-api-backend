import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SamplingPlot } from '../common/entities/sampling-plot.entity';
import { StudyZone } from '../common/entities/study-zone.entity';
import { Species } from '../common/entities/species.entity';
import { SpeciesZone } from '../common/entities/species-zone.entity';
import { FunctionalType } from '../common/entities/functional-type.entity';
import { UnitMeasurement } from '../common/entities/unit-measurement.entity';
import { User } from '../auth/entities/user.entity';

import { ProjectsService } from './projects/projects.service';
import { ProjectsController } from './projects/projects.controller';
import { ZonesService } from './zones/zones.service';
import { ZonesController } from './zones/zones.controller';
import { SpeciesService } from './species/species.service';
import { SpeciesController } from './species/species.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([SamplingPlot, StudyZone, Species, SpeciesZone, FunctionalType, UnitMeasurement, User]),
    ],
    controllers: [ProjectsController, ZonesController, SpeciesController],
    providers: [ProjectsService, ZonesService, SpeciesService],
    exports: [ProjectsService, ZonesService, SpeciesService],
})
export class BioCoreModule {}