import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthResponse, AuthUser, RefreshResponse } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,

        @InjectRepository(RefreshToken)
        private readonly refreshTokenRepository: Repository<RefreshToken>,

        private readonly jwtService: JwtService,
        private readonly dataSource: DataSource,
    ) { }

    // da formato al usuario para la respuesta
    private toAuthUser(user: User): AuthUser {
        return {
            userId: user.user_id,
            userName: user.user_name,
            userLastname: user.user_lastname,
            userBirthday: user.user_birthday,
            userEmail: user.user_email,
            profilePictureUrl: user.profile_picture_url ?? null,
            userRole: user.user_role ?? 'USER',
        };
    }

    private signTokens(user: User) {
        const payload = { sub: user.user_id, email: user.user_email, role: user.user_role };
        return {
            accessToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
            refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
        };
    }

    // guarda el refresh token con fecha de expiración
    private async saveRefreshToken(
        userId: number,
        token: string,
        manager: EntityManager,
    ): Promise<void> {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 días

        const record = manager.create(RefreshToken, {
            user_id: userId,
            token,
            expires_at: expiresAt,
        });

        await manager.save(record);
    }

    async register(dto: RegisterUserDto): Promise<AuthResponse> {
        const exists = await this.userRepository.findOne({
            where: { user_email: dto.userEmail },
        });

        if (exists) {
            throw new ConflictException('El correo electrónico ya está registrado.');
        }

        const hashedPassword = await bcrypt.hash(dto.userPassword, 10);

        // TRANSACCIÓN: crear usuario y guardar sesión (doble INSERT)
        return this.dataSource.transaction(async (manager) => {

            const user = manager.create(User, {
                user_name: dto.userName,
                user_lastname: dto.userLastname,
                user_birthday: new Date(dto.userBirthday),
                user_email: dto.userEmail,
                user_password: hashedPassword,
            });

            const saved = await manager.save(user);
            const { accessToken, refreshToken } = this.signTokens(saved);

            // guarda la sesión del usuario
            await this.saveRefreshToken(saved.user_id, refreshToken, manager);

            return { accessToken, refreshToken, user: this.toAuthUser(saved) };
        });
    }

    async login(dto: LoginUserDto): Promise<AuthResponse> {
        // se pide el password porque por defecto no se incluye
            const user = await this.userRepository.findOne({
                where: { user_email: dto.userEmail },
                select: ['user_id', 'user_name', 'user_lastname', 'user_birthday', 'user_email', 'user_password', 'user_role', 'profile_picture_url'],
            });

        if (!user) {
            throw new UnauthorizedException('Credenciales inválidas.');
        }

        const isValid = await bcrypt.compare(dto.userPassword, user.user_password);
        if (!isValid) {
            throw new UnauthorizedException('Credenciales inválidas.');
        }

        const { accessToken, refreshToken } = this.signTokens(user);

        // INSERT simple sin transacción: solo se guarda el refresh token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const record = this.refreshTokenRepository.create({
            user_id: user.user_id,
            token: refreshToken,
            expires_at: expiresAt,
        });
        await this.refreshTokenRepository.save(record);

        return { accessToken, refreshToken, user: this.toAuthUser(user) };
    }

    async refresh(refreshToken: string): Promise<RefreshResponse> {
        let payload: { sub: number; email: string; role: string };

        try {
            payload = this.jwtService.verify(refreshToken);
        } catch {
            throw new UnauthorizedException('La sesión ha expirado. Por favor, inicia sesión nuevamente.');
        }

        // verifica que la sesión siga activa
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

        // TRANSACCIÓN: borrar token viejo y crear nuevo (rotación atómica)
        const tokens = this.signTokens(user);

        await this.dataSource.transaction(async (manager) => {
            await manager.delete(RefreshToken, { token_id: tokenRecord.token_id });
            await this.saveRefreshToken(user.user_id, tokens.refreshToken, manager);
        });

        return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };

    }

    async logout(refreshToken: string): Promise<{ message: string }> {
        let payload: { sub: number };

        try {
            payload = this.jwtService.verify(refreshToken);
        } catch {
            throw new UnauthorizedException('No autorizado. Debes iniciar sesión para realizar esta acción.');
        }

        // cierra la sesión del usuario
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