import {
    Controller,
    Get,
    Param,
    Request,
    Res,
    UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PdfService } from './services/pdf.service';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
    constructor(private readonly pdfService: PdfService) { }

    @Get('pdf/:id')
    async downloadPdf(
        @Param('id') plotId: string,
        @Request() req,
        @Res() res: Response,
    ): Promise<void> {
        const userId: number = req.user.user_id;
        const buffer = await this.pdfService.generatePlotReport(plotId, userId);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="reporte-biodiversidad-${plotId}.pdf"`,
            'Content-Length': buffer.length,
        });

        res.end(buffer);
    }
}
