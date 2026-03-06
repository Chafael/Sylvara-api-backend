export class LatestPlotDto {
    samplingPlotId: number;
    samplingPlotName: string;
    description: string | null;
    totalArea: number;
    areaUnit: string;
    samplingPlotStatus: string;
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
