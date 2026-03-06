import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { User } from '../auth/entities/user.entity';
import { SamplingPlot } from '../common/entities/sampling-plot.entity';

@Injectable()
export class DashboardService {
    constructor(private readonly dataSource: DataSource) { }

    async getDashboard(userId: number): Promise<DashboardResponseDto> {
        const user = await this.dataSource.getRepository(User).findOne({ where: { user_id: userId } });

        const totalHistoricalPlots = await this.dataSource.getRepository(SamplingPlot).count({
            where: { userId: userId }
        });

        const dt = new Date();
        const startOfMonth = new Date(dt.getFullYear(), dt.getMonth(), 1);

        const currentMonthPlots = await this.dataSource.getRepository(SamplingPlot)
            .createQueryBuilder('p')
            .where('p.userId = :userId', { userId })
            .andWhere('p.samplingPlotStatus = :status', { status: 'active' })
            .andWhere('p.startDate >= :startOfMonth', { startOfMonth })
            .getCount();

        const latestPlots = await this.dataSource.getRepository(SamplingPlot)
            .createQueryBuilder('p')
            .leftJoinAndSelect('p.unitMeasurement', 'um')
            .where('p.userId = :userId', { userId })
            .orderBy('p.startDate', 'DESC')
            .addOrderBy('p.samplingPlotId', 'DESC')
            .limit(5)
            .getMany();

        return {
            summary: {
                userName: user?.user_name ?? '',
                pictureUrl: user?.profile_picture_url ?? null,
                totalHistoricalPlots: totalHistoricalPlots,
                currentMonthPlots: currentMonthPlots,
            },
            latestPlots: latestPlots.map((p) => ({
                samplingPlotId: p.samplingPlotId,
                samplingPlotName: p.samplingPlotName,
                description: p.description ?? null,
                totalArea: Number(p.totalArea),
                areaUnit: p.unitMeasurement?.unit_name ?? '',
                samplingPlotStatus: p.samplingPlotStatus as unknown as string,
                startDate: p.startDate ?? null,
            })),
        };
    }
}