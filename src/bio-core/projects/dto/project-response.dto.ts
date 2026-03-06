import { Expose, Transform, Type } from 'class-transformer';

export class DiversityIndicesResponse {
    @Expose() shannon: number;
    @Expose() simpson: number;
    @Expose() margalef: number;
    @Expose() pielou: number;
}

export class GlobalCountsResponse {
    @Expose() riqueza: number;
    @Expose() totalIndividuos: number;
}

export class GlobalMetricsResponse {
    @Expose() @Type(() => DiversityIndicesResponse) indices: DiversityIndicesResponse;
    @Expose() @Type(() => GlobalCountsResponse) counts: GlobalCountsResponse;
}

export class SpeciesRecordResponse {
    @Expose() speciesName: string;
    @Expose() commonName: string;
    @Expose() functionalTypeName: string;
    @Expose() individualCount: number;
    @Expose() heightStratumMin: number;
    @Expose() heightStratumMax: number;
}

export class ZoneDetailResponse {
    @Expose() zoneName: string;
    @Expose() @Type(() => DiversityIndicesResponse) indices: DiversityIndicesResponse;
    @Expose() riqueza: number;
    @Expose() totalIndividuos: number;
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
