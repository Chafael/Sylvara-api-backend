export class PlotResponseDto {
    samplingPlotId: number;
    userId: number;
    samplingPlotName: string;
    description: string | null;
    totalArea: number;
    unitId: number;
    unitName: string;
    samplingPlotStatus: string;
    currentCycleNumber: number;
    startDate: Date | null;
    endDate: Date | null;
}