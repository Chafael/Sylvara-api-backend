import { IsDateString, IsEmail, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    lastname?: string;

    @IsOptional()
    @IsDateString()
    birthday?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsUrl()
    pictureUrl?: string;
}
