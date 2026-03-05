export class ProfileResponseDto {
    id: number;
    name: string;
    lastname: string;
    birthday: Date;
    email: string;
    pictureUrl: string | null;
    role: string;
}
