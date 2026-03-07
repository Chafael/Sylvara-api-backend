import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    Request,
    UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) {}

    @Get()
    findAll(
        @Request() req,
        @Query('status') status?: string,
        @Query('cursor') cursor?: number,
        @Query('limit') limit?: number,
    ) {
        return this.projectsService.findAll(req.user.user_id, status, cursor ? Number(cursor) : undefined, limit ? Number(limit) : 20);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() dto: CreateProjectDto, @Request() req) {
        return this.projectsService.create(dto, req.user.user_id);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateProjectDto,
        @Request() req,
    ) {
        return this.projectsService.update(id, req.user.user_id, dto);
    }

    @Patch(':id/status')
    updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateProjectStatusDto,
        @Request() req,
    ) {
        return this.projectsService.updateStatus(id, req.user.user_id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
        return this.projectsService.remove(id, req.user.user_id);
    }
}