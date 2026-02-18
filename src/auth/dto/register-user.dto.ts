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
    user_name: string;

    @IsString()
    @IsNotEmpty()
    user_lastname: string;

    @IsDateString()
    @IsNotEmpty()
    user_birthday: string;

    @IsEmail()
    @IsNotEmpty()
    user_email: string;

    @IsString()
    @MinLength(8)
    user_password: string;
}
