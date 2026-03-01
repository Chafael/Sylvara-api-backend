import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { BenchmarkingService } from './benchmarking.service';
import { CreateDailyMetricDto } from './dto/create-daily-metric.dto';

@Controller('benchmarking')
export class BenchmarkingController {
    constructor(private readonly benchmarkingService: BenchmarkingService) { }

    @Post('daily')
    @HttpCode(HttpStatus.CREATED)
    createDailyMetric(@Body() dto: CreateDailyMetricDto) {
        return this.benchmarkingService.createDailyMetric(dto);
    }
}
