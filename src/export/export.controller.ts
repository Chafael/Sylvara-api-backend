import { Controller, Get, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
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
        @Req() req: Request & { user: { userId: number } },
    ): Promise<ReportDataResponseDto> {
        return this.reportDataService.getReportData(projectId, req.user.userId);
    }
}