import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserActivity, UserActivityDocument } from './schemas/user-activity.schema';
import { CreateUserActivityDto } from './dto/create-user-activity.dto';

@Injectable()
export class UserActivitiesService {
    constructor(
        @InjectModel(UserActivity.name)
        private readonly userActivityModel: Model<UserActivityDocument>,
    ) {}

    /**
     * Registra una nueva actividad de usuario.
     */
    async create(userId: number, dto: CreateUserActivityDto): Promise<UserActivity> {
        const activity = new this.userActivityModel({
            user_id: userId,
            activity_type: dto.activity_type,
            resource_type: dto.resource_type ?? null,
            resource_id: dto.resource_id ?? null,
            metadata: dto.metadata ?? null,
        });
        return activity.save();
    }

    /**
     * Obtiene las actividades de un usuario específico con paginación por cursor.
     * @param userId  ID del usuario
     * @param limit   Máximo de registros a retornar (default 20)
     * @param cursor  Timestamp ISO string para paginación (trae registros anteriores a este)
     */
    async findByUser(
        userId: number,
        limit = 20,
        cursor?: string,
    ): Promise<UserActivity[]> {
        const filter: any = { user_id: userId };
        if (cursor) {
            filter.createdAt = { $lt: new Date(cursor) };
        }
        return this.userActivityModel
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean()
            .exec();
    }

    /**
     * Obtiene todas las actividades (todos los usuarios) — uso ADMIN.
     */
    async findAll(limit = 50, cursor?: string): Promise<UserActivity[]> {
        const filter: any = {};
        if (cursor) {
            filter.createdAt = { $lt: new Date(cursor) };
        }
        return this.userActivityModel
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean()
            .exec();
    }
}
