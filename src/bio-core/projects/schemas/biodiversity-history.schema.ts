import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BiodiversityHistoryDocument = HydratedDocument<BiodiversityHistory>;

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
class SpeciesRecord {
  @Prop() species_name: string;
  @Prop() functional_type_name: string;
  @Prop() individual_count: number;
  @Prop() height_stratum_min: number;
  @Prop() height_stratum_max: number;
  @Prop() unit_name: string;
}

@Schema({ _id: false })
class ZoneHistory {
  @Prop({ required: true }) study_zone_id: number;
  @Prop({ required: true }) name_study_zone: string;
  @Prop({ type: DiversityIndices }) indices: DiversityIndices;
  @Prop({ type: Counts }) counts: Counts;
  @Prop({ type: [SpeciesRecord], default: [] }) speciesRecords: SpeciesRecord[];
}

@Schema({ collection: 'biodiversity_history', timestamps: false })
export class BiodiversityHistory {
  @Prop({ required: true }) timestamp: Date;
  @Prop({ required: true }) sampling_plot_id: number;
  @Prop({ required: true }) cycle_number: number;
  @Prop({ type: GlobalMetrics }) globalMetrics: GlobalMetrics;
  @Prop({ type: [ZoneHistory], default: [] }) zonesDetails: ZoneHistory[];
}

export const BiodiversityHistorySchema = SchemaFactory.createForClass(BiodiversityHistory);