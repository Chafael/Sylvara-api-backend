import {
    IsString,
    IsNotEmpty,
    IsNumber,
    IsPositive,
    IsInt,
    IsOptional,
    IsEnum,
    IsDateString,
} from 'class-validator';

export enum PlotStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
}

export class CreateProjectDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    image: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsEnum(PlotStatus)
    @IsOptional()
    status?: PlotStatus;

    @IsNumber()
    @IsPositive()
    totalArea: number;

    @IsInt()
    unitId: number;

    @IsInt()
    userId: number;

    @IsDateString()
    @IsOptional()
    startDate?: string;

    @IsDateString()
    @IsOptional()
    endDate?: string;
}
