import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserActivityDocument = HydratedDocument<UserActivity>;

@Schema({ collection: 'user_activities', timestamps: true })
export class UserActivity {
    /** ID del usuario (FK lógica a PostgreSQL users.user_id) */
    @Prop({ required: true, index: true })
    user_id: number;

    /**
     * Tipo de acción realizada.
     * Valores posibles: login | logout | register |
     * viewDashboard | viewProjects | viewProjectDetail | viewZoneDetail |
     * viewSpeciesList | viewBenchmarking | viewProfile | viewExport | viewIndices |
     * createProject | updateProject | updateProjectStatus | deleteProject |
     * createZone | updateZone | deleteZone |
     * createSpecies | updateSpecies | deleteSpecies |
     * takeSnapshot | sendBigquery | downloadCsv | generateCsv | resetBenchmarking |
     * exportReport | updateProfile | changePassword | deleteAccount
     */
    @Prop({ required: true, index: true })
    activity_type: string;

    /**
     * Tipo de recurso afectado (opcional).
     * Valores: 'project' | 'zone' | 'species' | null
     */
    @Prop({ default: null })
    resource_type: string | null;

    /**
     * ID del recurso afectado como string (opcional).
     */
    @Prop({ default: null })
    resource_id: string | null;

    /**
     * Datos extra opcionales (e.g. nombre de proyecto, página visitada, etc.)
     */
    @Prop({ type: Object, default: null })
    metadata: Record<string, any> | null;

    // createdAt y updatedAt se agregan automáticamente con timestamps: true
}

export const UserActivitySchema = SchemaFactory.createForClass(UserActivity);
