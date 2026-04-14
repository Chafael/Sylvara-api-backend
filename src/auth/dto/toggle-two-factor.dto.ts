import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ToggleTwoFactorDto {
    @IsBoolean()
    @IsNotEmpty()
    enabled!: boolean;
}