import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BiodiversityCacheDocument = HydratedDocument<BiodiversityCache>;

@Schema({ _id: false })
class DiversityIndices {
  @Prop() shannon: number;
  @Prop() simpson: number;
  @Prop() margalef: number;
  @Prop() pielou: number;
}

@Schema({ _id: false })
class Counts {
  @Prop() species_richness: number;
  @Prop() total_individuals: number;
}

@Schema({ _id: false })
class GlobalMetrics {
  @Prop({ type: DiversityIndices }) indices: DiversityIndices;
  @Prop({ type: Counts }) counts: Counts;
}

@Schema({ _id: false })
class ZoneCache {
  @Prop({ required: true }) study_zone_id: number;
  @Prop({ required: true }) name_study_zone: string;
  @Prop({ type: DiversityIndices }) indices: DiversityIndices;
  @Prop({ type: Counts }) counts: Counts;
}

@Schema({ collection: 'biodiversity_cache' })
export class BiodiversityCache {
  @Prop({ required: true }) sampling_plot_id: number;
  @Prop({ required: true }) cycle_number: number;
  @Prop() lastUpdated: Date;
  @Prop({ type: GlobalMetrics }) globalMetrics: GlobalMetrics;
  @Prop({ type: [ZoneCache], default: [] }) zonesDetails: ZoneCache[];
}

export const BiodiversityCacheSchema = SchemaFactory.createForClass(BiodiversityCache);