import {
    IsInt,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    IsUrl,
} from 'class-validator';

export class UpdateSpeciesDto {
    // campos globales — actualizan la tabla species para todas las zonas del proyecto
    @IsOptional()
    @IsString()
    speciesName?: string;

    @IsOptional()
    @IsUrl()
    speciesImageUrl?: string;

    @IsOptional()
    @IsInt()
    @IsPositive()
    functionalTypeId?: number;

    // campos locales — actualizan solo el registro en species_zone
    @IsOptional()
    @IsInt()
    @IsPositive()
    individualCount?: number;

    @IsOptional()
    @IsNumber()
    heightStratumMin?: number;

    @IsOptional()
    @IsNumber()
    heightStratumMax?: number;
}
