import { IsInt, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateZoneDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsNumber()
    @IsPositive()
    subArea?: number;

    @IsOptional()
    @IsInt()
    unitId?: number;
}
