import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { User } from '../auth/entities/user.entity';
import { SamplingPlot } from '../common/entities/sampling-plot.entity';

@Module({
    imports: [TypeOrmModule.forFeature([User, SamplingPlot])],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class DashboardModule {}