export class ProfileResponseDto {
    userId: number;
    userName: string;
    userLastname: string;
    userBirthday: Date;
    userEmail: string;
    profilePictureUrl: string | null;
    userRole: string;
}