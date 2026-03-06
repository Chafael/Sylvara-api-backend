import {
    Controller,
    Get,
    Post,
    Body,
    Request,
    Res,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SnapshotService } from './services/snapshot.service';
import { BigQueryService } from '../export/bigquery.service';
import { CsvService } from './services/csv.service';
import { GoogleOAuthService } from './services/google-oauth.service';
import { SnapshotRequestDto } from './dto/snapshot-request.dto';

@Controller('benchmarking')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BenchmarkingController {
    private readonly PROJECT_ID = 8;

    constructor(
        private readonly snapshotService: SnapshotService,
        private readonly bigQueryService: BigQueryService,
        private readonly csvService: CsvService,
        private readonly googleOAuthService: GoogleOAuthService,
    ) { }

    // ─── Corte del Día (usuario autenticado) ─────────────────

    @Get('snapshot')
    @HttpCode(HttpStatus.OK)
    getSnapshot() {
        return this.snapshotService.getSnapshot();
    }

    @Post('snapshot')
    @HttpCode(HttpStatus.OK)
    async createSnapshot(
        @Body() dto: SnapshotRequestDto,
        @Request() req: { user: { user_id: number } },
    ) {
        const googleToken = dto.googleAccessToken;

        const rawRows = await this.snapshotService.getSnapshot();
        const rows = this.snapshotService.formatForBigQuery(rawRows);
        const inserted = await this.bigQueryService.insertDailyQueryMetrics(googleToken, rows);

        return {
            message: 'Snapshot enviado a BigQuery exitosamente.',
            rowsInserted: inserted,
            snapshotDate: new Date().toISOString().slice(0, 10),
        };
    }

    @Post('reset')
    @HttpCode(HttpStatus.OK)
    async resetStatistics() {
        await this.snapshotService.resetStatistics();
        return { message: 'Estadísticas de pg_stat_statements reseteadas.' };
    }

    @Get('csv/generate')
    @HttpCode(HttpStatus.OK)
    async generateCsv() {
        const rows = await this.snapshotService.getSnapshot();
        const filePath = this.csvService.generateCsv(rows, this.PROJECT_ID);
        return {
            message: 'CSV de respaldo generado.',
            filePath,
            rows: rows.length,
        };
    }

    @Get('csv/download')
    downloadCsv(@Res() res: Response) {
        const result = this.csvService.getLatestCsv(this.PROJECT_ID);

        if (!result) {
            res.status(HttpStatus.NOT_FOUND).json({
                message: 'No hay CSV de respaldo disponible. Genera uno primero.',
            });
            return;
        }

        res.set({
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${result.fileName}"`,
        });
        res.send(result.buffer);
    }

    // ─── Consulta de métricas (solo ADMIN) ───────────────────

    @Get('metrics')
    @Roles('ADMIN')
    async getMetrics(
        @Request() req: { user: { user_id: number } },
    ) {
        const googleToken = await this.googleOAuthService.getValidAccessToken(
            req.user.user_id,
        );

        const rows = await this.bigQueryService.getDailyQueryMetrics(googleToken);
        return { data: rows, total: rows.length };
    }
}