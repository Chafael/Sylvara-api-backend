// Objeto user dentro de AuthResponse 
export interface AuthUser {
    id: number;
    name: string;
    lastname: string;
    email: string;
    role: string;
}

// Respuesta completa de login y register
export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
}
