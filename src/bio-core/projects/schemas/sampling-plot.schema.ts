import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SamplingPlotDocument = HydratedDocument<SamplingPlot>;

@Schema({ _id: false })
class DiversityIndices {
    @Prop({ type: Number }) shannon: number;
    @Prop({ type: Number }) simpson: number;
    @Prop({ type: Number }) margalef: number;
    @Prop({ type: Number }) pielou: number;
}
const DiversityIndicesSchema = SchemaFactory.createForClass(DiversityIndices);

@Schema({ _id: false })
class GlobalCounts {
    @Prop({ type: Number }) riqueza: number;
    @Prop({ type: Number }) total_individuos: number;
}
const GlobalCountsSchema = SchemaFactory.createForClass(GlobalCounts);

@Schema({ _id: false })
class GlobalMetrics {
    @Prop({ type: DiversityIndicesSchema }) indices: DiversityIndices;
    @Prop({ type: GlobalCountsSchema }) counts: GlobalCounts;
}
const GlobalMetricsSchema = SchemaFactory.createForClass(GlobalMetrics);

@Schema({ _id: false })
class SpeciesRecord {
    @Prop({ type: String }) speciesName: string;
    @Prop({ type: String }) commonName: string;
    @Prop({ type: String }) functionalTypeName: string;
    @Prop({ type: Number }) individualCount: number;
    @Prop({ type: Number }) heightStratumMin: number;
    @Prop({ type: Number }) heightStratumMax: number;
}
const SpeciesRecordSchema = SchemaFactory.createForClass(SpeciesRecord);

@Schema({ _id: false })
class ZoneDetail {
    @Prop({ type: String, required: true }) zone_name: string;
    @Prop({ type: DiversityIndicesSchema }) indices: DiversityIndices;
    @Prop({ type: Number }) riqueza: number;
    @Prop({ type: Number }) total_individuos: number;
    @Prop({ type: [SpeciesRecordSchema], default: [] }) speciesRecords: SpeciesRecord[];
}
const ZoneDetailSchema = SchemaFactory.createForClass(ZoneDetail);

// Documento principal de una parcela de muestreo
@Schema({ collection: 'sampling_plots', timestamps: true })
export class SamplingPlot {
    @Prop({ required: true, trim: true }) name: string;
    @Prop() description: string;

    @Prop({ type: String, enum: ['active', 'inactive'], default: 'active' })
    status: string;

    @Prop({ required: true, type: Number }) totalArea: number;
    @Prop({ required: true, type: Number }) unitId: number;
    @Prop({ type: String, default: 'Metros' }) unitName: string;
    @Prop({ required: true, type: Number }) userId: number;
    @Prop({ required: true, type: Number, unique: true }) postgresId: number;
    @Prop({ type: Number, default: 1 }) currentCycleNumber: number;
    @Prop({ type: Date }) startDate: Date;
    @Prop({ type: Date }) endDate: Date;

    @Prop({ type: GlobalMetricsSchema }) globalMetrics: GlobalMetrics;
    @Prop({ type: [ZoneDetailSchema], default: [] }) zonesDetails: ZoneDetail[];
}

export const SamplingPlotSchema = SchemaFactory.createForClass(SamplingPlot);
