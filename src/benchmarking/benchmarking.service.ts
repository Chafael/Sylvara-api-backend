import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyMetric } from './entities/daily-metric.entity';
import { CreateDailyMetricDto } from './dto/create-daily-metric.dto';

@Injectable()
export class BenchmarkingService {
    constructor(
        @InjectRepository(DailyMetric)
        private readonly dailyMetricRepository: Repository<DailyMetric>,
    ) { }

    async createDailyMetric(dto: CreateDailyMetricDto): Promise<DailyMetric> {
        const metric = this.dailyMetricRepository.create(dto);
        return this.dailyMetricRepository.save(metric);
    }
}
