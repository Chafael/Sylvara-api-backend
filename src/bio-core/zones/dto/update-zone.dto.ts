import { IsInt, IsNumber, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateZoneDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(250)
    nameStudyZone?: string;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    subArea?: number;

    @IsOptional()
    @IsInt()
    unitId?: number;
}