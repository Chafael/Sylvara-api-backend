import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Query,
    Request,
    UseGuards,
} from '@nestjs/common';
import { UserActivitiesService } from './user-activities.service';
import { CreateUserActivityDto } from './dto/create-user-activity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('user-activities')
@UseGuards(JwtAuthGuard)
export class UserActivitiesController {
    constructor(private readonly userActivitiesService: UserActivitiesService) {}

    /**
     * POST /user-activities
     * Registra una actividad del usuario autenticado.
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(
        @Body() dto: CreateUserActivityDto,
        @Request() req: { user: { user_id: number } },
    ) {
        return this.userActivitiesService.create(req.user.user_id, dto);
    }

    /**
     * GET /user-activities
     * Retorna las actividades del usuario autenticado con paginación por cursor.
     * Query params: limit (default 20), cursor (ISO timestamp)
     */
    @Get()
    findMyActivities(
        @Request() req: { user: { user_id: number } },
        @Query('limit') limit?: string,
        @Query('cursor') cursor?: string,
    ) {
        return this.userActivitiesService.findByUser(
            req.user.user_id,
            limit ? parseInt(limit, 10) : 20,
            cursor,
        );
    }
}
