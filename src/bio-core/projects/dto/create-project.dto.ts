import {
    IsString,
    IsNotEmpty,
    IsNumber,
    IsPositive,
    IsInt,
    IsOptional,
    IsEnum,
    IsDateString,
    IsArray,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PlotStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
}

export class DiversityIndicesDto {
    @IsOptional() @IsNumber() shannon?: number;
    @IsOptional() @IsNumber() simpson?: number;
    @IsOptional() @IsNumber() margalef?: number;
    @IsOptional() @IsNumber() pielou?: number;
}

export class GlobalCountsDto {
    @IsOptional() @IsNumber() riqueza?: number;
    @IsOptional() @IsNumber() total_individuos?: number;
}

export class GlobalMetricsDto {
    @IsOptional() @ValidateNested() @Type(() => DiversityIndicesDto)
    indices?: DiversityIndicesDto;

    @IsOptional() @ValidateNested() @Type(() => GlobalCountsDto)
    counts?: GlobalCountsDto;
}

export class SpeciesRecordDto {
    @IsOptional() @IsString() species_name?: string;
    @IsOptional() @IsString() common_name?: string;
    @IsOptional() @IsString() functional_type_name?: string;
    @IsOptional() @IsNumber() individual_count?: number;
    @IsOptional() @IsNumber() height_min?: number;
    @IsOptional() @IsNumber() height_max?: number;
}

export class ZoneDetailDto {
    @IsString() @IsNotEmpty() zone_name: string;

    @IsOptional() @ValidateNested() @Type(() => DiversityIndicesDto)
    indices?: DiversityIndicesDto;

    @IsOptional() @IsNumber() riqueza?: number;
    @IsOptional() @IsNumber() total_individuos?: number;

    @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SpeciesRecordDto)
    speciesRecords?: SpeciesRecordDto[];
}

export class CreateProjectDto {
    @IsString() @IsNotEmpty() samplingPlotName: string;

    @IsString() @IsOptional() description?: string;
    @IsEnum(PlotStatus) @IsOptional() status?: PlotStatus;
    @IsNumber() @IsPositive() totalArea: number;
    @IsInt() unitId: number;
    @IsDateString() @IsOptional() startDate?: string;
    @IsDateString() @IsOptional() endDate?: string;

    @IsOptional() @ValidateNested() @Type(() => GlobalMetricsDto)
    globalMetrics?: GlobalMetricsDto;

    @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ZoneDetailDto)
    zonesDetails?: ZoneDetailDto[];
}
