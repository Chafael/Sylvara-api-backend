export class BiodiversityIndicesDto {
    shannon: number;
    simpson: number;
    margalef: number;
    pielou: number;
}

export class BiodiversityCountsDto {
    speciesRichness: number;
    totalIndividuals: number;
}

export class ZoneResponseDto {
    studyZoneId: number;
    nameStudyZone: string;
    subArea: number;
    unitId: number;
    unitName: string;
    cycleNumber: number;
    indices: BiodiversityIndicesDto;
    counts: BiodiversityCountsDto;
}

export class GlobalMetricsDto {
    indices: BiodiversityIndicesDto;
    counts: BiodiversityCountsDto;
}

export class ZonesResponseDto {
    samplingPlotId: number;
    cycleNumber: number;
    globalMetrics: GlobalMetricsDto;
    zones: ZoneResponseDto[];
}