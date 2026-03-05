import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SamplingPlot as MongoSamplingPlot, SamplingPlotSchema } from './projects/schemas/sampling-plot.schema';
import { SamplingPlot } from '../common/entities/sampling-plot.entity';
import { StudyZone } from '../common/entities/study-zone.entity';
import { Species } from '../common/entities/species.entity';
import { SpeciesZone } from '../common/entities/species-zone.entity';
import { FunctionalType } from '../common/entities/functional-type.entity';

import { ProjectsService } from './projects/projects.service';
import { ProjectsController } from './projects/projects.controller';
import { ZonesService } from './zones/zones.service';
import { ZonesController } from './zones/zones.controller';
import { SpeciesService } from './species/species.service';
import { SpeciesController } from './species/species.controller';

@Module({
    imports: [
        // Mongoose — biodiversity cache (MongoDB)
        MongooseModule.forFeature([{ name: MongoSamplingPlot.name, schema: SamplingPlotSchema }]),
        // TypeORM — estructura principal (PostgreSQL)
        TypeOrmModule.forFeature([SamplingPlot, StudyZone, Species, SpeciesZone, FunctionalType]),
    ],
    controllers: [ProjectsController, ZonesController, SpeciesController],
    providers: [ProjectsService, ZonesService, SpeciesService],
    exports: [ProjectsService, ZonesService, SpeciesService],
})
export class BioCoreModule { }
