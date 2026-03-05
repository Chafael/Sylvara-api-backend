import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Request,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportDataService } from './services/report-data.service';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
    constructor(private readonly reportDataService: ReportDataService) { }

    @Get('report-data/:id')
    getReportData(
        @Param('id', ParseIntPipe) plotId: number,
        @Request() req,
    ) {
        return this.reportDataService.getReportData(plotId, req.user.user_id);
    }
}
