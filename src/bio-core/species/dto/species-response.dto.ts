export class SpeciesZoneResponseDto {
    speciesZoneId: number;
    speciesId: number;
    speciesName: string;
    speciesImageUrl: string | null;
    functionalTypeId: number;
    functionalTypeName: string;
    individualCount: number;
    heightStratumMin: number | null;
    heightStratumMax: number | null;
    unitId: number;
    unitName: string;
    cycleNumber: number;
}
