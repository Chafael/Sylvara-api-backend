export class SpeciesZoneResponseDto {
    speciesZoneId: number;
    speciesId: number;
    speciesName: string;
    imageUrl: string | null;
    functionalTypeId: number;
    functionalTypeName: string;
    individualCount: number;
    heightStratumMin: number | null;
    heightStratumMax: number | null;
    unitId: number;
    unitName: string;
    cycleNumber: number;
}
