import { IsNotEmpty, IsString } from 'class-validator';

export class SnapshotRequestDto {
    @IsString()
    @IsNotEmpty()
    googleAccessToken: string;
}
