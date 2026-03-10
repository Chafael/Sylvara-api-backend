import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { InjectDataSource } from '@nestjs/typeorm';
import { Connection } from 'mongoose';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
    constructor(
        @InjectDataSource() private readonly postgresConnection: DataSource,
        @InjectConnection() private readonly mongoConnection: Connection,
    ) { }

    @Get()
    async check() {
        const postgresStatus = this.postgresConnection.isInitialized;
        const mongoStatus = this.mongoConnection.readyState === 1; // 1 = connected

        return {
            status: postgresStatus && mongoStatus ? 'ok' : 'error',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            services: {
                postgres: postgresStatus ? 'up' : 'down',
                mongodb: mongoStatus ? 'up' : 'down',
            },
        };
    }
}
