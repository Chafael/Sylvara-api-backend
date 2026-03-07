import {
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    IsUrl,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export class CreateSpeciesDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(250)
    speciesName: string;

    @IsOptional()
    @IsUrl()
    @MaxLength(512)
    speciesImageUrl?: string;

    @IsInt()
    @IsPositive()
    functionalTypeId: number;

    @IsInt()
    @Min(1)
    individualCount: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    heightStratumMin: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    heightStratumMax: number;
}