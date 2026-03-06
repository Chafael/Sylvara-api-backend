import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);

    console.log("Checking for v_daily_export view...");
    try {
        await dataSource.query(`
            CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
            
            DROP VIEW IF EXISTS v_daily_export;
            
            CREATE VIEW v_daily_export AS
            SELECT 
                1 AS project_id,
                CURRENT_DATE AS snapshot_date,
                queryid::text,
                dbid,
                userid,
                query,
                calls,
                total_exec_time AS total_exec_time_ms,
                mean_exec_time AS mean_exec_time_ms,
                min_exec_time AS min_exec_time_ms,
                max_exec_time AS max_exec_time_ms,
                stddev_exec_time AS stddev_exec_time_ms,
                shared_blks_hit,
                shared_blks_read,
                shared_blks_dirtied,
                shared_blks_written,
                temp_blks_read,
                temp_blks_written,
                rows AS rows_returned
            FROM pg_stat_statements;
        `);
        console.log("✅ v_daily_export view created successfully.");
    } catch (e) {
        console.error("❌ Error creating view:", e.message);
        console.log("Attempting a dummy view for testing...");
        await dataSource.query(`
            CREATE VIEW v_daily_export AS
            SELECT 
                1 AS project_id,
                CURRENT_DATE AS snapshot_date,
                'dummy-query-id' AS queryid,
                0 AS dbid,
                0 AS userid,
                'SELECT 1' AS query,
                100 AS calls,
                10.5 AS total_exec_time_ms,
                0.1 AS mean_exec_time_ms,
                0.05 AS min_exec_time_ms,
                0.2 AS max_exec_time_ms,
                0.01 AS stddev_exec_time_ms,
                10 AS shared_blks_hit,
                1 AS shared_blks_read,
                0 AS shared_blks_dirtied,
                0 AS shared_blks_written,
                0 AS temp_blks_read,
                0 AS temp_blks_written,
                1 AS rows_returned;
        `);
        console.log("✅ Dummy v_daily_export view created for testing.");
    }

    await app.close();
}

bootstrap();
