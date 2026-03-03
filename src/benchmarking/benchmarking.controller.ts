import {
    Controller,
    Get,
    Post,
    Headers,
    Res,
    UseGuards,
    UnauthorizedException,
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

@Controller('benchmarking')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BenchmarkingController {
    private readonly PROJECT_ID = 1; // Sylvara

    constructor(
        private readonly snapshotService: SnapshotService,
        private readonly bigQueryService: BigQueryService,
        private readonly csvService: CsvService,
    ) {}

    // ─── Corte del Día (usuario autenticado) ─────────────────

    /** 1. Lee v_daily_export y retorna el snapshot actual */
    @Get('snapshot')
    @HttpCode(HttpStatus.OK)
    getSnapshot() {
        return this.snapshotService.getSnapshot();
    }

    /** 2. Envía el snapshot a BigQuery */
    @Post('bigquery/send')
    @HttpCode(HttpStatus.CREATED)
    async sendToBigQuery(
        @Headers('x-google-token') googleToken: string,
    ) {
        if (!googleToken) {
            throw new UnauthorizedException(
                'Se requiere el header x-google-token con un token de Google válido.',
            );
        }

        const rows = await this.snapshotService.getSnapshot();

        // enviar fila por fila a BigQuery
        let inserted = 0;
        for (const row of rows) {
            await this.bigQueryService.insertDailyQueryMetric(
                googleToken, 
                row as unknown as Record<string, unknown>
            );
            inserted++;
        }

        return {
            message: `Snapshot enviado a BigQuery exitosamente.`,
            rowsInserted: inserted,
            snapshotDate: new Date().toISOString().slice(0, 10),
        };
    }

    /** 3. Resetea pg_stat_statements (solo después de envío exitoso) */
    @Post('reset')
    @HttpCode(HttpStatus.OK)
    async resetStatistics() {
        await this.snapshotService.resetStatistics();
        return { message: 'Estadísticas de pg_stat_statements reseteadas.' };
    }

    /** 4. Genera CSV de respaldo y lo descarga */
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

    /** 5. Descarga el último CSV generado */
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

    /** 6. Consulta métricas desde BigQuery */
    @Get('metrics')
    @Roles('ADMIN')
    async getMetrics(
        @Headers('x-google-token') googleToken: string,
    ) {
        if (!googleToken) {
            throw new UnauthorizedException(
                'Se requiere el header x-google-token con un token de Google válido.',
            );
        }

        const rows = await this.bigQueryService.getDailyQueryMetrics(googleToken);
        return { data: rows, total: rows.length };
    }
}