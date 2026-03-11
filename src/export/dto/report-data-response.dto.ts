export class SpeciesRecordDto {
    speciesName: string;
    functionalTypeName: string;
    individualCount: number;
    heightMin: number;
    heightMax: number;
    unitName: string;
}

export class ZoneBiodiversityDto {
    zoneId: number;
    zoneName: string;
    subArea: number;
    unitName: string;
    cycleNumber: number;

    // Contadores
    speciesRichness: number;
    totalIndividuals: number;

    // Índices
    indices: {
        shannon: number;
        simpson: number;
        margalef: number;
        pielou: number;
    };

    speciesRecords: SpeciesRecordDto[];
}

export class GlobalMetricsDto {
    speciesRichness: number;
    totalIndividuals: number;
    indices: {
        shannon: number;
        simpson: number;
        margalef: number;
        pielou: number;
    };
}

export class ReportDataResponseDto {
    // ── Proyecto ──────────────────────────────────────────────
    projectId: number;
    projectName: string;
    description: string | null;
    totalArea: number;
    unitName: string;
    status: string;
    cycleNumber: number;
    startDate: Date | null;
    endDate: Date | null;

    // ── Investigador ──────────────────────────────────────────
    researcherName: string;
    researcherLastname: string;

    // ── Métricas globales ─────────────────────────────────────
    globalMetrics: GlobalMetricsDto;

    // ── Zonas con sus especies ────────────────────────────────
    zonesDetails: ZoneBiodiversityDto[];
}