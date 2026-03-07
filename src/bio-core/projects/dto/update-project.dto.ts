import {
    IsDateString,
    IsInt,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export class UpdateProjectDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    samplingPlotName?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    description?: string;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    totalArea?: number;

    @IsOptional()
    @IsInt()
    @IsPositive()
    unitId?: number;

    @IsOptional()
    @IsDateString()
    startDate?: string;
}