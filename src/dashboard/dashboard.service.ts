import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { SamplingPlot } from '../common/entities/sampling-plot.entity';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,

        @InjectRepository(SamplingPlot)
        private readonly plotRepo: Repository<SamplingPlot>,
    ) {}

    async getDashboard(userId: number): Promise<DashboardResponseDto> {
        const user = await this.userRepo.findOne({ where: { user_id: userId } });
        if (!user) throw new NotFoundException('Usuario no encontrado.');

        const allPlots = await this.plotRepo.find({ where: { user_id: userId } });

        const now = new Date();
        const currentMonthPlots = allPlots.filter((p) => {
            const created = new Date(p.start_date ?? 0);
            return (
                created.getFullYear() === now.getFullYear() &&
                created.getMonth() === now.getMonth()
            );
        }).length;

        const latestPlots = await this.plotRepo
            .createQueryBuilder('p')
            .leftJoinAndSelect('p.unitMeasurement', 'um')
            .where('p.user_id = :userId', { userId })
            .orderBy('p.sampling_plot_id', 'DESC')
            .take(5)
            .getMany();

        return {
            user: {
                userName: user.user_name,
                profilePictureUrl: user.profile_picture_url ?? null,
            },
            summary: {
                totalHistoricalPlots: allPlots.length,
                currentMonthPlots,
            },
            latestPlots: latestPlots.map((p) => ({
                id: p.sampling_plot_id,
                name: p.sampling_plot_name,
                description: p.description ?? null,
                totalArea: Number(p.total_area),
                areaUnit: p.unitMeasurement?.unit_name ?? '',
                status: p.sampling_plot_status,
                startDate: p.start_date ?? null,
            })),
        };
    }
}