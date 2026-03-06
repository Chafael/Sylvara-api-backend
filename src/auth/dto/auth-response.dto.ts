// Objeto user dentro de AuthResponse 
export interface AuthUser {
    userId: number;
    userName: string;
    userLastname: string;
    userBirthday: string;
    userEmail: string;
    profilePictureUrl: string | null;
    userRole: string;
}

// Respuesta completa de login y register
export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
}
