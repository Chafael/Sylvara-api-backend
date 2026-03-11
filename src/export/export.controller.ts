// src/export/export.controller.ts

import { Controller, Get, Param, ParseIntPipe, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportDataService } from './services/report-data.service';
import { ReportDataResponseDto } from './dto/report-data-response.dto';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
    constructor(private readonly reportDataService: ReportDataService) {}

    @Get('report-data/:projectId')
    async getReportData(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Request() req: { user: { user_id: number } },   // jwt.strategy devuelve user_id (snake_case)
    ): Promise<ReportDataResponseDto> {
        return this.reportDataService.getReportData(projectId, req.user.user_id);
    }
}