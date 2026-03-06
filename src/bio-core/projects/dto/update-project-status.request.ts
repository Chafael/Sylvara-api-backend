import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { PlotStatus } from './create-project.dto';

export class UpdateProjectStatusRequest {
    @IsEnum(PlotStatus)
    @IsNotEmpty()
    samplingPlotStatus: PlotStatus;

    @IsString()
    @MinLength(8)
    @IsNotEmpty()
    password: string;
}
