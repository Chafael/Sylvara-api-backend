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
    name: string;

    @IsString()
    @IsNotEmpty()
    lastname: string;

    @IsDateString()
    @IsNotEmpty()
    birthday: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @MinLength(8)
    password: string;
}
