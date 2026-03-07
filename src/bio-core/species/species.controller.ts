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
    Res,
    UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { SpeciesService } from './species.service';
import { CreateSpeciesDto } from './dto/create-species.dto';
import { UpdateSpeciesDto } from './dto/update-species.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('projects/:plotId/zones/:zoneId/species')
@UseGuards(JwtAuthGuard)
export class SpeciesController {
    constructor(private readonly speciesService: SpeciesService) {}

    @Get('catalog')
    getCatalog(
        @Param('plotId', ParseIntPipe) plotId: number,
        @Param('zoneId', ParseIntPipe) zoneId: number,
        @Query('cursor') cursor?: number,
        @Query('limit') limit?: number,
        @Request() req?,
    ) {
        return this.speciesService.getCatalog(plotId, zoneId, req.user.user_id, cursor ? Number(cursor) : undefined, limit ? Number(limit) : 20);
    }

    @Get()
    findAll(
        @Param('plotId', ParseIntPipe) plotId: number,
        @Param('zoneId', ParseIntPipe) zoneId: number,
        @Query('cursor') cursor?: number,
        @Query('limit') limit?: number,
        @Request() req?,
    ) {
        return this.speciesService.findAll(zoneId, plotId, req.user.user_id, cursor ? Number(cursor) : undefined, limit ? Number(limit) : 20);
    }

    @Post()
    async create(
        @Param('plotId', ParseIntPipe) plotId: number,
        @Param('zoneId', ParseIntPipe) zoneId: number,
        @Body() dto: CreateSpeciesDto,
        @Request() req,
        @Res() res: Response,
    ) {
        const result = await this.speciesService.create(zoneId, plotId, req.user.user_id, dto);
        return res.status(result.status).json(result.data);
    }

    @Patch(':speciesZoneId')
    update(
        @Param('plotId', ParseIntPipe) plotId: number,
        @Param('zoneId', ParseIntPipe) zoneId: number,
        @Param('speciesZoneId', ParseIntPipe) speciesZoneId: number,
        @Body() dto: UpdateSpeciesDto,
        @Request() req,
    ) {
        return this.speciesService.update(speciesZoneId, zoneId, plotId, req.user.user_id, dto);
    }

    @Delete(':speciesZoneId')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(
        @Param('plotId', ParseIntPipe) plotId: number,
        @Param('zoneId', ParseIntPipe) zoneId: number,
        @Param('speciesZoneId', ParseIntPipe) speciesZoneId: number,
        @Request() req,
    ) {
        return this.speciesService.remove(speciesZoneId, zoneId, plotId, req.user.user_id);
    }
}