export class LatestPlotDto {
    id: number;
    name: string;
    description: string | null;
    totalArea: number;
    areaUnit: string;
    status: string;
    startDate: Date | null;
}

export class DashboardUserDto {
    userName: string;
    profilePictureUrl: string | null;
}

export class DashboardSummaryDto {
    totalHistoricalPlots: number;
    currentMonthPlots: number;
}

export class DashboardResponseDto {
    user: DashboardUserDto;
    summary: DashboardSummaryDto;
    latestPlots: LatestPlotDto[];
}