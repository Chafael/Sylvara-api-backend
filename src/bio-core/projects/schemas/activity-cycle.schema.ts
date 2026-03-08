import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ActivityCycleDocument = HydratedDocument<ActivityCycle>;

@Schema({ _id: false })
class DiversityIndices {
  @Prop() shannon: number;
  @Prop() simpson: number;
  @Prop() margalef: number;
  @Prop() pielou: number;
}

@Schema({ _id: false })
class GlobalCounts {
  @Prop() species_richness: number;
  @Prop() total_individuals: number;
}

@Schema({ _id: false })
class GlobalMetrics {
  @Prop({ type: DiversityIndices }) indices: DiversityIndices;
  @Prop({ type: GlobalCounts }) counts: GlobalCounts;
}

@Schema({ _id: false })
class SpeciesRecord {
  @Prop() species_name: string;
  @Prop() functional_type_name: string;
  @Prop() total_individuals_in_plot: number;
  @Prop({ type: [String] }) presence_in_zones: string[];
}

@Schema({ _id: false })
class ZoneSpeciesRecord {
  @Prop() species_name: string;
  @Prop() individual_count: number;
  @Prop() height_stratum_min: number;
  @Prop() height_stratum_max: number;
  @Prop() unit_name: string;
}

@Schema({ _id: false })
class ZoneDetail {
  @Prop({ required: true }) study_zone_id: number;
  @Prop({ required: true }) name_study_zone: string;
  @Prop({ type: DiversityIndices }) indices: DiversityIndices;
  @Prop({ type: [ZoneSpeciesRecord], default: [] }) speciesRecords: ZoneSpeciesRecord[];
}

@Schema({ collection: 'activity_cycles' })
export class ActivityCycle {
  @Prop({ required: true }) sampling_plot_id: number;
  @Prop({ required: true }) cycle_number: number;
  @Prop({ default: 'inactive' }) sampling_plot_status: string;
  @Prop() startDate: string;
  @Prop() endDate: string;
  @Prop({ type: GlobalMetrics }) globalMetrics: GlobalMetrics;
  @Prop({ type: [SpeciesRecord], default: [] }) global_species_summary: SpeciesRecord[];
  @Prop({ type: [ZoneDetail], default: [] }) zonesDetails: ZoneDetail[];
}

export const ActivityCycleSchema = SchemaFactory.createForClass(ActivityCycle);