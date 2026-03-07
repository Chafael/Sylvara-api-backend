import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum PlotStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
}

export class UpdateProjectStatusDto {
    @IsEnum(PlotStatus)
    samplingPlotStatus: PlotStatus;

    @IsString()
    @IsNotEmpty()
    password: string;
}