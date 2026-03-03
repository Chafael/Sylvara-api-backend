// src/export/bigquery.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery } from '@google-cloud/bigquery';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class BigQueryService {
    private readonly projectId: string;
    private readonly datasetId: string;
    private readonly tableId: string;

    constructor(private readonly configService: ConfigService) {
        this.projectId = this.configService.get<string>('BQ_PROJECT_ID', 'data-from-software');
        this.datasetId = this.configService.get<string>('BQ_DATASET_ID', 'benchmarking_warehouse');
        this.tableId = this.configService.get<string>('BQ_TABLE_ID', 'daily_query_metrics');
    }

    private buildClient(googleToken: string): BigQuery {
        const authClient = new OAuth2Client();
        authClient.setCredentials({ access_token: googleToken });

        return new BigQuery({
            projectId: this.projectId,
            authClient,
        });
    }

    async getDailyQueryMetrics(googleToken: string): Promise<Record<string, unknown>[]> {
        const bigquery = this.buildClient(googleToken);

        const query = `
            SELECT *
            FROM \`${this.projectId}.${this.datasetId}.${this.tableId}\`
            ORDER BY snapshot_date DESC
            LIMIT 1000
        `;

        try {
            const [rows] = await bigquery.query({ query });
            return rows as Record<string, unknown>[];
        } catch (error) {
            const msg = (error as Error).message;
            throw new InternalServerErrorException(`Error al consultar BigQuery: ${msg}`);
        }
    }

    async insertDailyQueryMetrics(
        googleToken: string,
        rows: Record<string, unknown>[],
    ): Promise<number> {
        if (rows.length === 0) return 0;

        const bigquery = this.buildClient(googleToken);
        const table = bigquery.dataset(this.datasetId).table(this.tableId);

        try {
            await table.insert(rows);
            return rows.length;
        } catch (error: any) {
            const details = error.errors
                ? JSON.stringify(error.errors.slice(0, 3))
                : (error as Error).message;
            throw new InternalServerErrorException(
                `Error al insertar en BigQuery: ${details}`,
            );
        }
    }
}

