import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface SnapshotRow {
    project_id: number;
    snapshot_date: string;
    queryid: string;
    dbid: number;
    userid: number;
    query: string;
    calls: number;
    total_exec_time_ms: number;
    mean_exec_time_ms: number;
    min_exec_time_ms: number;
    max_exec_time_ms: number;
    stddev_exec_time_ms: number;
    shared_blks_hit: number;
    shared_blks_read: number;
    shared_blks_dirtied: number;
    shared_blks_written: number;
    temp_blks_read: number;
    temp_blks_written: number;
    rows_returned: number;
}

@Injectable()
export class SnapshotService {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    async getSnapshot(): Promise<SnapshotRow[]> {
        try {
            const rows = await this.dataSource.query(
                'SELECT * FROM v_daily_export',
            );
            return rows as SnapshotRow[];
        } catch (error) {
            throw new InternalServerErrorException(
                `Error al leer v_daily_export: ${(error as Error).message}`,
            );
        }
    }

    async resetStatistics(): Promise<void> {
        try {
            await this.dataSource.query('SELECT pg_stat_statements_reset()');
        } catch (error) {
            throw new InternalServerErrorException(
                `Error al resetear estadísticas: ${(error as Error).message}`,
            );
        }
    }
}