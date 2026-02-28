import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthResponse, AuthUser } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,

        @InjectRepository(RefreshToken)
        private readonly refreshTokenRepository: Repository<RefreshToken>,

        private readonly jwtService: JwtService,
    ) { }

    // convierte la entidad de BD al objeto user del contrato OpenAPI
    private toAuthUser(user: User): AuthUser {
        return {
            id: user.user_id,
            name: user.user_name,
            lastname: user.user_lastname,
            email: user.user_email,
            role: user.user_role ?? 'USER',
        };
    }

    private signTokens(user: User) {
        const payload = { sub: user.user_id, email: user.user_email, role: user.user_role };
        return {
            accessToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
            refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
        };
    }

    /** Guarda un refresh token en la tabla refresh_tokens */
    private async saveRefreshToken(userId: number, token: string): Promise<void> {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 días

        const record = this.refreshTokenRepository.create({
            user_id: userId,
            token,
            expires_at: expiresAt,
        });

        await this.refreshTokenRepository.save(record);
    }

    async register(dto: RegisterUserDto): Promise<AuthResponse> {
        const exists = await this.userRepository.findOne({
            where: { user_email: dto.email },
        });

        if (exists) {
            throw new ConflictException('El correo electrónico ya está registrado.');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        // mapeo DTO (OpenAPI) a columnas de PostgreSQL
        const user = this.userRepository.create({
            user_name: dto.name,
            user_lastname: dto.lastname,
            user_birthday: new Date(dto.birthday),
            user_email: dto.email,
            user_password: hashedPassword,
        });

        const saved = await this.userRepository.save(user);
        const { accessToken, refreshToken } = this.signTokens(saved);

        // persistir el refresh token en la BD
        await this.saveRefreshToken(saved.user_id, refreshToken);

        return { accessToken, refreshToken, user: this.toAuthUser(saved) };
    }

    async login(dto: LoginUserDto): Promise<AuthResponse> {
        // incluir password porque select: false lo excluye por defecto
        const user = await this.userRepository.findOne({
            where: { user_email: dto.email },
            select: ['user_id', 'user_name', 'user_lastname', 'user_email', 'user_password', 'user_role'],
        });

        if (!user) {
            throw new UnauthorizedException('Credenciales inválidas.');
        }

        const isValid = await bcrypt.compare(dto.password, user.user_password);
        if (!isValid) {
            throw new UnauthorizedException('Credenciales inválidas.');
        }

        const { accessToken, refreshToken } = this.signTokens(user);

        // persistir el refresh token en la BD
        await this.saveRefreshToken(user.user_id, refreshToken);

        return { accessToken, refreshToken, user: this.toAuthUser(user) };
    }

    async refresh(refreshToken: string): Promise<AuthResponse> {
        let payload: { sub: number; email: string; role: string };

        try {
            payload = this.jwtService.verify(refreshToken);
        } catch {
            throw new UnauthorizedException('La sesión ha expirado. Por favor, inicia sesión nuevamente.');
        }

        // verificar que el token existe en la BD (no fue invalidado)
        const tokenRecord = await this.refreshTokenRepository.findOne({
            where: { token: refreshToken, user_id: payload.sub },
        });

        if (!tokenRecord) {
            throw new UnauthorizedException('La sesión ha expirado. Por favor, inicia sesión nuevamente.');
        }

        const user = await this.userRepository.findOne({
            where: { user_id: payload.sub },
        });

        if (!user) {
            throw new UnauthorizedException('La sesión ha expirado. Por favor, inicia sesión nuevamente.');
        }

        // eliminar el token viejo y emitir uno nuevo (rotación)
        await this.refreshTokenRepository.delete({ token_id: tokenRecord.token_id });
        const tokens = this.signTokens(user);
        await this.saveRefreshToken(user.user_id, tokens.refreshToken);

        return { ...tokens, user: this.toAuthUser(user) };
    }

    async logout(refreshToken: string): Promise<{ message: string }> {
        let payload: { sub: number };

        try {
            payload = this.jwtService.verify(refreshToken);
        } catch {
            throw new UnauthorizedException('No autorizado. Debes iniciar sesión para realizar esta acción.');
        }

        // eliminar el registro de la tabla refresh_tokens
        const result = await this.refreshTokenRepository.delete({
            token: refreshToken,
            user_id: payload.sub,
        });

        if (!result.affected || result.affected === 0) {
            throw new UnauthorizedException('No autorizado. Debes iniciar sesión para realizar esta acción.');
        }

        return { message: 'Sesión cerrada exitosamente' };
    }

    async getMe(userId: number): Promise<AuthUser> {
        const user = await this.userRepository.findOne({
            where: { user_id: userId },
        });

        if (!user) {
            throw new UnauthorizedException('No autorizado. El token es inválido o ha expirado.');
        }

        return this.toAuthUser(user);
    }
}
