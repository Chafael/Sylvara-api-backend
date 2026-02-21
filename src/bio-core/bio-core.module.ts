import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SamplingPlot, SamplingPlotSchema } from './projects/schemas/sampling-plot.schema';
import { ProjectsService } from './projects/projects.service';
import { ProjectsController } from './projects/projects.controller';

@Module({
    imports: [MongooseModule.forFeature([{ name: SamplingPlot.name, schema: SamplingPlotSchema }])],
    controllers: [ProjectsController],
    providers: [ProjectsService],
})
export class BioCoreModule { }
