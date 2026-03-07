import {
    IsInt,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    IsUrl,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export class UpdateSpeciesDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(250)
    speciesName?: string;

    @IsOptional()
    @IsUrl()
    @MaxLength(512)
    speciesImageUrl?: string;

    @IsOptional()
    @IsInt()
    @IsPositive()
    functionalTypeId?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    individualCount?: number;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    heightStratumMin?: number;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    heightStratumMax?: number;
}