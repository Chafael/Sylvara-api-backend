import { IsInt, IsNotEmpty, IsNumber, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateZoneDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(250)
    nameStudyZone: string;

    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    subArea: number;

    @IsInt()
    unitId: number;
}