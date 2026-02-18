import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginUserDto {
    @IsEmail()
    @IsNotEmpty()
    user_email: string;

    @IsString()
    @IsNotEmpty()
    user_password: string;
}
