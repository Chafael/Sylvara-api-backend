import {
    IsDateString,
    IsEmail,
    IsNotEmpty,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

export class RegisterUserDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    userName!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    userLastname!: string;

    @IsDateString()
    @IsNotEmpty()
    userBirthday!: string;

    @IsEmail()
    @IsNotEmpty()
    @MaxLength(255)
    userEmail!: string;

    @IsString()
    @MinLength(8)
    @MaxLength(255)
    @Matches(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z\d\s]).+$/, {
        message: 'La contraseña debe ser alfanumérica y contener al menos un carácter especial.',
    })
    userPassword!: string;
}