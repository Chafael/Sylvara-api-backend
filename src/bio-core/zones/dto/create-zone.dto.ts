import { IsInt, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateZoneDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsNumber()
    @IsPositive()
    subArea: number;

    @IsInt()
    unitId: number;
}
