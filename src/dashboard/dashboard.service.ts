import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

const DB_VIEWS = {
    userSummary: 'view_user_summary',
    latestPlots: 'view_latest_plots',
} as const;



@Injectable()
export class DashboardService {
    constructor(private readonly dataSource: DataSource) { }

    async getDashboard(userId: number): Promise<DashboardResponseDto> {
        const rows = await this.dataSource.query<any[]>(
            `SELECT u.user_name,
                    u.profile_picture_url,
                    vus.total_historical_plots,
                    vus.current_month_plots,
                    vlp.id AS plot_id,
                    vlp.name AS plot_name,
                    vlp.description,
                    vlp.total_area,
                    vlp.area_unit,
                    vlp.status,
                    vlp.start_date
             FROM users u
             JOIN view_user_summary vus ON u.user_id = vus.user_id
             LEFT JOIN view_latest_plots vlp ON u.user_id = vlp.user_id
             WHERE u.user_id = $1`,
            [userId],
        );

        const s = rows[0] ?? {};

        return {
            summary: {
                userName: s.user_name ?? '',
                pictureUrl: s.profile_picture_url ?? null,
                totalHistoricalPlots: Number(s.total_historical_plots ?? 0),
                currentMonthPlots: Number(s.current_month_plots ?? 0),
            },
            latestPlots: rows
                .filter((r) => r.plot_id !== null)
                .map((r) => ({
                    id: r.plot_id,
                    name: r.plot_name,
                    description: r.description ?? null,
                    totalArea: Number(r.total_area),
                    areaUnit: r.area_unit,
                    status: r.status,
                    startDate: r.start_date ?? null,
                })),
        };
    }
}