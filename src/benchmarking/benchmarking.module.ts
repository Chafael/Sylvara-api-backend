import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyMetric } from './entities/daily-metric.entity';
import { BenchmarkingController } from './benchmarking.controller';
import { BenchmarkingService } from './benchmarking.service';

@Module({
    imports: [TypeOrmModule.forFeature([DailyMetric])],
    controllers: [BenchmarkingController],
    providers: [BenchmarkingService],
})
export class BenchmarkingModule { }
