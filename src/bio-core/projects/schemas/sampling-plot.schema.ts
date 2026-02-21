import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SamplingPlotDocument = HydratedDocument<SamplingPlot>;

@Schema({ collection: 'sampling_plots', timestamps: true })
export class SamplingPlot {
    @Prop({ required: true, trim: true })
    name: string;

    @Prop({ required: true })
    image: string;

    @Prop()
    description: string;

    @Prop({ type: String, enum: ['active', 'inactive'], default: 'active' })
    status: string;

    @Prop({ required: true, type: Number })
    totalArea: number;

    @Prop({ required: true, type: Number })
    unitId: number;

    @Prop({ required: true, type: Number })
    userId: number;

    @Prop({ type: Date })
    startDate: Date;

    @Prop({ type: Date })
    endDate: Date;
}

export const SamplingPlotSchema = SchemaFactory.createForClass(SamplingPlot);
