import {
    IsDateString,
    IsEmail,
    IsNotEmpty,
    IsString,
    MinLength,
    MaxLength,
} from 'class-validator';

export class RegisterUserDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    userName: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    userLastname: string;

    @IsDateString()
    @IsNotEmpty()
    userBirthday: string;

    @IsEmail()
    @IsNotEmpty()
    @MaxLength(255)
    userEmail: string;

    @IsString()
    @MinLength(8)
    @MaxLength(255)
    userPassword: string;
}