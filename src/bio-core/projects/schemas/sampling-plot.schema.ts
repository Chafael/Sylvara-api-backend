import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SamplingPlotDocument = HydratedDocument<SamplingPlot>;

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

/** Índices de diversidad (siempre "shannon", nunca "shannon_wiener") */
@Schema({ _id: false })
class DiversityIndices {
    @Prop({ type: Number })
    shannon: number;

    @Prop({ type: Number })
    simpson: number;

    @Prop({ type: Number })
    margalef: number;

    @Prop({ type: Number })
    pielou: number;
}
const DiversityIndicesSchema = SchemaFactory.createForClass(DiversityIndices);

/** Conteos globales */
@Schema({ _id: false })
class GlobalCounts {
    @Prop({ type: Number })
    riqueza: number;           // número de especies únicas

    @Prop({ type: Number })
    total_individuos: number;  // suma de todos los individuos
}
const GlobalCountsSchema = SchemaFactory.createForClass(GlobalCounts);

/** Métricas globales del muestreo */
@Schema({ _id: false })
class GlobalMetrics {
    @Prop({ type: DiversityIndicesSchema })
    indices: DiversityIndices;

    @Prop({ type: GlobalCountsSchema })
    counts: GlobalCounts;
}
const GlobalMetricsSchema = SchemaFactory.createForClass(GlobalMetrics);

/** Registro de una especie dentro de una zona */
@Schema({ _id: false })
class SpeciesRecord {
    @Prop({ type: String })
    species_name: string;          // nombre científico

    @Prop({ type: String })
    common_name: string;           // nombre común

    @Prop({ type: String })
    functional_type_name: string;  // tipo funcional

    @Prop({ type: Number })
    individual_count: number;

    @Prop({ type: Number })
    height_min: number;            // altura mínima registrada (m)

    @Prop({ type: Number })
    height_max: number;            // altura máxima registrada (m)
}
const SpeciesRecordSchema = SchemaFactory.createForClass(SpeciesRecord);

/** Detalle de una zona dentro de la parcela */
@Schema({ _id: false })
class ZoneDetail {
    @Prop({ type: String, required: true })
    zone_name: string;

    @Prop({ type: DiversityIndicesSchema })
    indices: DiversityIndices;

    @Prop({ type: Number })
    riqueza: number;

    @Prop({ type: Number })
    total_individuos: number;

    @Prop({ type: [SpeciesRecordSchema], default: [] })
    speciesRecords: SpeciesRecord[];
}
const ZoneDetailSchema = SchemaFactory.createForClass(ZoneDetail);

// ─── Documento principal ─────────────────────────────────────────────────────

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

    /** Métricas globales del plot (calculadas por el análisis) */
    @Prop({ type: GlobalMetricsSchema })
    globalMetrics: GlobalMetrics;

    /** Detalle por zona, incluyendo índices y registros de especies */
    @Prop({ type: [ZoneDetailSchema], default: [] })
    zonesDetails: ZoneDetail[];
}

export const SamplingPlotSchema = SchemaFactory.createForClass(SamplingPlot);
