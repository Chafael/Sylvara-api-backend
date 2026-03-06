import {
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    IsUrl,
} from 'class-validator';

export class CreateSpeciesDto {
    @IsString()
    @IsNotEmpty()
    speciesName: string;

    @IsInt()
    @IsPositive()
    functionalTypeId: number;

    @IsOptional()
    @IsUrl()
    imageUrl?: string;

    @IsInt()
    @IsPositive()
    individualCount: number;

    @IsNumber()
    heightStratumMin: number;

    @IsNumber()
    heightStratumMax: number;

    @IsOptional()
    @IsInt()
    @IsPositive()
    unitId?: number;
}
