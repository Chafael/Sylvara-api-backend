import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) { }

    @Post()
    create(@Body() dto: CreateProjectDto, @Request() req) {
        return this.projectsService.create(dto, req.user.user_id);
    }

    @Get()
    findAll(@Request() req) {
        return this.projectsService.findAll(req.user.user_id);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.projectsService.findOne(id, req.user.user_id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    remove(@Param('id') id: string, @Request() req) {
        return this.projectsService.remove(id, req.user.user_id);
    }
}
