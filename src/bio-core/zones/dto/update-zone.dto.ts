import { IsInt, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateZoneDto {
    @IsOptional()
    @IsString()
    nameStudyZone?: string;

    @IsOptional()
    @IsNumber()
    @IsPositive()
    subArea?: number;

    @IsOptional()
    @IsInt()
    unitId?: number;
}
