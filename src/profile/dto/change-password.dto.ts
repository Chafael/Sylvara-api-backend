import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(255)
    currentPassword!: string;

    @IsString()
    @MinLength(8)
    @MaxLength(255)
    @Matches(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z\d\s]).+$/, {
        message: 'La contraseña debe ser alfanumérica y contener al menos un carácter especial.',
    })
    newPassword!: string;
}