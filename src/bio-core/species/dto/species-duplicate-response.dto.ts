export class SpeciesDuplicateExistingRecordDto {
    speciesZoneId: number | null;
    speciesId: number;
    speciesName: string;
    speciesImageUrl: string | null;
    functionalTypeId: number | null;
    functionalTypeName: string | null;
    individualCount: number | null;
    heightStratumMin: number | null;
    heightStratumMax: number | null;
    unitName: string | null;
}

export class SpeciesDuplicateResponseDto {
    code: 'SPECIES_EXISTS_IN_CATALOG' | 'SPECIES_EXISTS_IN_ZONE';
    message: string;
    existingRecord: SpeciesDuplicateExistingRecordDto;
}