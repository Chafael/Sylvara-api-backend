export class SpeciesZoneResponseDto {
    speciesZoneId: number;
    speciesId: number;
    speciesName: string;
    imageUrl: string | null;
    functionalTypeId: number;
    functionalTypeName: string;
    individualCount: number;
    heightMin: number | null;
    heightMax: number | null;
    unitId: number;
    unitName: string;
    cycleNumber: number;
}
