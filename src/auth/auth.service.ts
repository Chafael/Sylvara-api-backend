import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import {
    AuthResponse,
    AuthUser,
    RefreshResponse,
    TwoFactorPendingResponse,
} from './dto/auth-response.dto';
import { VerifyTwoFactorDto } from './dto/verify-two-factor.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { PROJECT_CONSTANTS } from '../common/constants/project-constants';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,

        @InjectRepository(RefreshToken)
        private readonly refreshTokenRepository: Repository<RefreshToken>,

        private readonly jwtService: JwtService,
        private readonly dataSource: DataSource,
        private readonly configService: ConfigService,
        private readonly mailService: MailService,
    ) {}

    private toAuthUser(user: User): AuthUser {
        return {
            userId: user.user_id,
            userName: user.user_name,
            userLastname: user.user_lastname,
            userBirthday: user.user_birthday,
            userEmail: user.user_email,
            profilePictureUrl: user.profile_picture_url ?? null,
            userRole: user.user_role ?? UserRole.USER,
            twoFactorEnabled: user.two_factor_enabled ?? false,
        };
    }

    private signTokens(user: User) {
        const payload = { sub: user.user_id, email: user.user_email, role: user.user_role };

        const accessExpires =
            this.configService.get<string>('JWT_ACCESS_EXPIRES') ??
            PROJECT_CONSTANTS.JWT_ACCESS_EXPIRES_DEFAULT;

        const refreshExpires =
            this.configService.get<string>('JWT_REFRESH_EXPIRES') ??
            PROJECT_CONSTANTS.JWT_REFRESH_EXPIRES_DEFAULT;

        return {
            accessToken: this.jwtService.sign(payload, { expiresIn: accessExpires as any }),
            refreshToken: this.jwtService.sign(payload, { expiresIn: refreshExpires as any }),
        };
    }

    private signTwoFactorToken(user: User): string {
        return this.jwtService.sign(
            { sub: user.user_id, email: user.user_email, scope: '2fa_pending' },
            { expiresIn: '10m' },
        );
    }

    private generateCode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    private async saveRefreshToken(
        userId: number,
        token: string,
        manager: EntityManager,
    ): Promise<void> {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const record = manager.create(RefreshToken, {
            user_id: userId,
            token,
            expires_at: expiresAt,
        });

        await manager.save(record);
    }

async register(dto: RegisterUserDto): Promise<TwoFactorPendingResponse> {
    const exists = await this.userRepository.findOne({
        where: { user_email: dto.userEmail },
    });

    if (exists) {
        throw new ConflictException('El correo electrónico ya está registrado.');
    }

    const saltRoundsStr =
        this.configService.get<string>('BCRYPT_SALT_ROUNDS') ??
        PROJECT_CONSTANTS.DEFAULT_BCRYPT_SALT_ROUNDS.toString();
    const saltRounds = parseInt(saltRoundsStr, 10);
    const hashedPassword = await bcrypt.hash(dto.userPassword, saltRounds);

    const saved = await this.dataSource.transaction(async (manager) => {
        const user = manager.create(User, {
            user_name: dto.userName,
            user_lastname: dto.userLastname,
            user_birthday: new Date(dto.userBirthday),
            user_email: dto.userEmail,
            user_password: hashedPassword,
            two_factor_enabled: true,
        });
        return manager.save(user);
    });

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.userRepository.update(saved.user_id, {
        two_factor_code: code,
        two_factor_expires_at: expiresAt,
    });

    await this.mailService.sendTwoFactorCode(saved.user_email, code);

    return {
        requiresTwoFactor: true,
        twoFactorToken: this.signTwoFactorToken(saved),
    };
}

    async login(dto: LoginUserDto): Promise<AuthResponse | TwoFactorPendingResponse> {
        const user = await this.userRepository.findOne({
            where: { user_email: dto.userEmail },
            select: [
                'user_id', 'user_name', 'user_lastname', 'user_birthday',
                'user_email', 'user_password', 'user_role', 'profile_picture_url',
                'two_factor_enabled', 'two_factor_code', 'two_factor_expires_at',
            ],
        });

        if (!user) {
            throw new UnauthorizedException('El correo y/o la contraseña son incorrectos.');
        }

        const isValid = await bcrypt.compare(dto.userPassword, user.user_password);
        if (!isValid) {
            throw new UnauthorizedException('El correo y/o la contraseña son incorrectos.');
        }

        // Si 2FA está activo: enviar código y devolver token temporal
        if (user.two_factor_enabled) {
            const code = this.generateCode();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

            await this.userRepository.update(user.user_id, {
                two_factor_code: code,
                two_factor_expires_at: expiresAt,
            });

            await this.mailService.sendTwoFactorCode(user.user_email, code);

            return {
                requiresTwoFactor: true,
                twoFactorToken: this.signTwoFactorToken(user),
            };
        }

        // Flujo normal sin 2FA
        const { accessToken, refreshToken } = this.signTokens(user);

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

    async verifyTwoFactor(
        userId: number,
        dto: VerifyTwoFactorDto,
    ): Promise<AuthResponse> {
        const user = await this.userRepository.findOne({
            where: { user_id: userId },
            select: [
                'user_id', 'user_name', 'user_lastname', 'user_birthday',
                'user_email', 'user_role', 'profile_picture_url',
                'two_factor_enabled', 'two_factor_code', 'two_factor_expires_at',
            ],
        });

        if (!user) {
            throw new UnauthorizedException('Usuario no encontrado.');
        }

        if (!user.two_factor_code || !user.two_factor_expires_at) {
            throw new UnauthorizedException('No hay un código de verificación activo.');
        }

        if (new Date() > user.two_factor_expires_at) {
            throw new UnauthorizedException('El código de verificación ha expirado.');
        }

        if (user.two_factor_code !== dto.code) {
            throw new UnauthorizedException('El código de verificación es incorrecto.');
        }

        // Limpiar código usado
        await this.userRepository.update(userId, {
            two_factor_code: null,
            two_factor_expires_at: null,
        });

        const { accessToken, refreshToken } = this.signTokens(user);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const record = this.refreshTokenRepository.create({
            user_id: userId,
            token: refreshToken,
            expires_at: expiresAt,
        });
        await this.refreshTokenRepository.save(record);

        return { accessToken, refreshToken, user: this.toAuthUser(user) };
    }

    async toggleTwoFactor(userId: number, enabled: boolean): Promise<{ message: string; twoFactorEnabled: boolean }> {
        await this.userRepository.update(userId, { two_factor_enabled: enabled });
        return {
            message: enabled
                ? 'Autenticación de dos pasos activada.'
                : 'Autenticación de dos pasos desactivada.',
            twoFactorEnabled: enabled,
        };
    }

    async refresh(refreshToken: string): Promise<RefreshResponse> {
        let payload: { sub: number; email: string; role: string };

        try {
            payload = this.jwtService.verify(refreshToken);
        } catch {
            throw new UnauthorizedException('La sesión ha expirado. Por favor, inicia sesión nuevamente.');
        }

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