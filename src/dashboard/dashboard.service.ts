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
        // las dos queries corren en paralelo contra las vistas de Toño
        const [summaryRows, latestRows] = await Promise.all([
            this.dataSource.query<any[]>(
                `SELECT u.user_name,
                        u.profile_picture_url,
                        v.total_historical_plots,
                        v.current_month_plots
                 FROM ${DB_VIEWS.userSummary} v
                 JOIN users u ON u.user_id = v.user_id
                 WHERE v.user_id = $1`,
                [userId],
            ),
            this.dataSource.query<any[]>(
                `SELECT id, name, description, total_area, area_unit, status, start_date
                 FROM ${DB_VIEWS.latestPlots}
                 WHERE user_id = $1`,
                [userId],
            ),
        ]);

        const s = summaryRows[0] ?? {};

        return {
            summary: {
                userName: s.user_name ?? '',
                pictureUrl: s.profile_picture_url ?? null,
                totalHistoricalPlots: Number(s.total_historical_plots ?? 0),
                currentMonthPlots: Number(s.current_month_plots ?? 0),
            },
            latestPlots: latestRows.map((r) => ({
                id: r.id,
                name: r.name,
                description: r.description ?? null,
                totalArea: Number(r.total_area),
                areaUnit: r.area_unit,
                status: r.status,
                startDate: r.start_date ?? null,
            })),
        };
    }
}
