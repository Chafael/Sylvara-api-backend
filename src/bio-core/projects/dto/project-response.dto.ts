import { Expose, Transform, Type } from 'class-transformer';

export class DiversityIndicesResponse {
    @Expose() shannon: number;
    @Expose() simpson: number;
    @Expose() margalef: number;
    @Expose() pielou: number;
}

export class GlobalCountsResponse {
    @Expose() riqueza: number;
    @Expose() total_individuos: number;
}

export class GlobalMetricsResponse {
    @Expose() @Type(() => DiversityIndicesResponse) indices: DiversityIndicesResponse;
    @Expose() @Type(() => GlobalCountsResponse) counts: GlobalCountsResponse;
}

export class SpeciesRecordResponse {
    @Expose() species_name: string;
    @Expose() common_name: string;
    @Expose() functional_type_name: string;
    @Expose() individual_count: number;
    @Expose() height_min: number;
    @Expose() height_max: number;
}

export class ZoneDetailResponse {
    @Expose() zone_name: string;
    @Expose() @Type(() => DiversityIndicesResponse) indices: DiversityIndicesResponse;
    @Expose() riqueza: number;
    @Expose() total_individuos: number;
    @Expose() @Type(() => SpeciesRecordResponse) speciesRecords: SpeciesRecordResponse[];
}

export class ProjectResponseDto {
    @Expose()
    @Transform(({ obj }) => obj.postgresId)
    samplingPlotId: number;

    @Expose() userId: number;

    @Expose()
    @Transform(({ obj }) => obj.name)
    samplingPlotName: string;

    @Expose() description: string;

    @Expose()
    @Transform(({ obj }) => obj.status)
    samplingPlotStatus: string;

    @Expose() totalArea: number;
    @Expose() unitId: number;
    @Expose() unitName: string;
    @Expose() currentCycleNumber: number;
    @Expose() startDate: Date;
    @Expose() endDate: Date;

    @Expose() @Type(() => GlobalMetricsResponse) globalMetrics: GlobalMetricsResponse;
    @Expose() @Type(() => ZoneDetailResponse) zonesDetails: ZoneDetailResponse[];
}
