import { IsDateString, IsEmail, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    userName?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    userLastname?: string;

    @IsOptional()
    @IsDateString()
    userBirthday?: string;

    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    userEmail?: string;

    @IsOptional()
    @IsUrl()
    @MaxLength(512)
    profilePictureUrl?: string;
}