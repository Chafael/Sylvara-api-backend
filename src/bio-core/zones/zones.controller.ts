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
    Request,
    UseGuards,
} from '@nestjs/common';
import { ZonesService } from './zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('projects/:sampling_plot_id/zones')
@UseGuards(JwtAuthGuard)
export class ZonesController {
    constructor(private readonly zonesService: ZonesService) { }

    @Get()
    findAll(
        @Param('sampling_plot_id', ParseIntPipe) plotId: number,
        @Request() req,
    ) {
        return this.zonesService.findAll(plotId, req.user.user_id);
    }

    @Post()
    create(
        @Param('sampling_plot_id', ParseIntPipe) plotId: number,
        @Body() dto: CreateZoneDto,
        @Request() req,
    ) {
        return this.zonesService.create(plotId, req.user.user_id, dto);
    }

    @Patch(':zoneId')
    update(
        @Param('sampling_plot_id', ParseIntPipe) plotId: number,
        @Param('zoneId', ParseIntPipe) zoneId: number,
        @Body() dto: UpdateZoneDto,
        @Request() req,
    ) {
        return this.zonesService.update(zoneId, plotId, req.user.user_id, dto);
    }

    @Delete(':zoneId')
    @HttpCode(HttpStatus.OK)
    remove(
        @Param('sampling_plot_id', ParseIntPipe) plotId: number,
        @Param('zoneId', ParseIntPipe) zoneId: number,
        @Request() req,
    ) {
        return this.zonesService.remove(zoneId, plotId, req.user.user_id);
    }
}
