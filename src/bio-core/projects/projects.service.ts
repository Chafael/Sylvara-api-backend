import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { SamplingPlot, SamplingPlotDocument } from './schemas/sampling-plot.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';

@Injectable()
export class ProjectsService {
    constructor(
        @InjectModel(SamplingPlot.name)
        private readonly plotModel: Model<SamplingPlotDocument>,
    ) { }

    private toResponse(doc: SamplingPlotDocument): ProjectResponseDto {
        return plainToInstance(ProjectResponseDto, doc.toObject(), {
            excludeExtraneousValues: true,
        });
    }

    async create(dto: CreateProjectDto): Promise<ProjectResponseDto> {
        const created = new this.plotModel(dto);
        const saved = await created.save();
        return this.toResponse(saved);
    }

    async findAll(): Promise<ProjectResponseDto[]> {
        const plots = await this.plotModel.find().exec();
        return plots.map(p => this.toResponse(p));
    }

    async findOne(id: string): Promise<ProjectResponseDto> {
        const plot = await this.plotModel.findById(id).exec();
        if (!plot) throw new NotFoundException(`Parcela con id ${id} no encontrada.`);
        return this.toResponse(plot);
    }

    async remove(id: string): Promise<{ message: string }> {
        const result = await this.plotModel.findByIdAndDelete(id).exec();
        if (!result) throw new NotFoundException(`Parcela con id ${id} no encontrada.`);
        return { message: 'Parcela eliminada exitosamente.' };
    }
}
