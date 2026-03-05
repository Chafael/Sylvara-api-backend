export class LatestPlotDto {
    id: number;
    name: string;
    description: string | null;
    totalArea: number;
    areaUnit: string;
    status: string;
    startDate: Date | null;
}

export class UserSummaryDto {
    userName: string;
    pictureUrl: string | null;
    totalHistoricalPlots: number;
    currentMonthPlots: number;
}

export class DashboardResponseDto {
    summary: UserSummaryDto;
    latestPlots: LatestPlotDto[];
}
