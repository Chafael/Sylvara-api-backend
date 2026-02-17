import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ProjectStatus } from '../../../common/constants/project-status.enum';

@Schema({ timestamps: true })
export class Project extends Document {
  @Prop({ required: true, trim: true })
  project_name: string;

  @Prop({ 
    type: String, 
    enum: ProjectStatus, 
    default: ProjectStatus.ACTIVE 
  })
  project_status: string;

  @Prop({ required: true })
  total_area: number;

  @Prop({ required: true })
  unit_name: string;

  @Prop({ required: true })
  user_id: number; // ID del usuario en PostgreSQL que creó el proyecto

  @Prop()
  description: string; // Descripción opcional del proyecto agroforestal
}

export const ProjectSchema = SchemaFactory.createForClass(Project);