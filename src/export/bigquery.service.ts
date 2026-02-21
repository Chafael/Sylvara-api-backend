import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { BigQuery } from '@google-cloud/bigquery';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class BigQueryService {
    private readonly projectId = 'data-from-software';
    private readonly datasetId = 'benchmarking_warehouse';
    private readonly tableId = 'daily_query_metrics';

    /**
     * Builds a BigQuery client authenticated with a user-supplied OAuth2 token
     * that comes directly from the mobile app (Google Sign-In access token).
     * Uses OAuth2Client from google-auth-library as the authClient so the
     * BigQuery SDK can refresh / validate the token correctly.
     */
    private buildClient(googleToken: string): BigQuery {
        const authClient = new OAuth2Client();
        authClient.setCredentials({ access_token: googleToken });

        return new BigQuery({
            projectId: this.projectId,
            authClient,
        });
    }

    /**
     * Returns all rows from `daily_query_metrics` using the caller's Google token.
     * @param googleToken  OAuth2 access token forwarded from the mobile client.
     */
    async getDailyQueryMetrics(googleToken: string): Promise<Record<string, unknown>[]> {
        const bigquery = this.buildClient(googleToken);

        const query = `
      SELECT *
      FROM \`${this.projectId}.${this.datasetId}.${this.tableId}\`
      ORDER BY date DESC
      LIMIT 1000
    `;

        try {
            const [rows] = await bigquery.query({ query, location: 'US' });
            return rows as Record<string, unknown>[];
        } catch (error) {
            throw new InternalServerErrorException(
                `BigQuery query failed: ${(error as Error).message}`,
            );
        }
    }

    /**
     * Streams a single row into `daily_query_metrics` using the caller's Google token.
     * @param googleToken  OAuth2 access token forwarded from the mobile client.
     * @param row          The data row to insert.
     */
    async insertDailyQueryMetric(
        googleToken: string,
        row: Record<string, unknown>,
    ): Promise<void> {
        const bigquery = this.buildClient(googleToken);
        const dataset = bigquery.dataset(this.datasetId);
        const table = dataset.table(this.tableId);

        try {
            await table.insert(row);
        } catch (error) {
            throw new InternalServerErrorException(
                `BigQuery insert failed: ${(error as Error).message}`,
            );
        }
    }
}
