export interface AuthUser {
    userId: number;
    userName: string;
    userLastname: string;
    userBirthday: Date;
    userEmail: string;
    profilePictureUrl: string | null;
    userRole: string;
    twoFactorEnabled: boolean;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
}

export interface RefreshResponse {
    accessToken: string;
    refreshToken: string;
}

export interface TwoFactorPendingResponse {
    requiresTwoFactor: true;
    twoFactorToken: string;
}