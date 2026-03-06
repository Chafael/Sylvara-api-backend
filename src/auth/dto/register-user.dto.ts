import {
    IsDateString,
    IsEmail,
    IsNotEmpty,
    IsString,
    MinLength,
} from 'class-validator';

export class RegisterUserDto {
    @IsString()
    @IsNotEmpty()
    userName: string;

    @IsString()
    @IsNotEmpty()
    userLastname: string;

    @IsDateString()
    @IsNotEmpty()
    userBirthday: string;

    @IsEmail()
    @IsNotEmpty()
    userEmail: string;

    @IsString()
    @MinLength(8)
    userPassword: string;
}
