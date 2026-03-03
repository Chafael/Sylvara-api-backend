import {
    Injectable,
    InternalServerErrorException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuth2Client } from 'google-auth-library';
import { GoogleToken } from '../entities/google-token.entity';

@Injectable()
export class GoogleOAuthService {
    private readonly oauth2Client: OAuth2Client;
    private readonly BIGQUERY_SCOPE = 'https://www.googleapis.com/auth/bigquery';

    constructor(
        private readonly configService: ConfigService,

        @InjectRepository(GoogleToken)
        private readonly googleTokenRepository: Repository<GoogleToken>,
    ) {
        this.oauth2Client = new OAuth2Client(
            this.configService.get<string>('GOOGLE_CLIENT_ID'),
            this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
            this.configService.get<string>('GOOGLE_CALLBACK_URL'),
        );
    }

    /** Genera la URL de autorización de Google */
    getAuthUrl(userId: number): string {
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: [this.BIGQUERY_SCOPE],
            state: String(userId),
        });
    }

    /** Intercambia el code por tokens y los guarda en BD */
    async handleCallback(code: string, userId: number): Promise<GoogleToken> {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);

            const expiresAt = new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000);

            // upsert: actualizar si ya existe, crear si no
            let record = await this.googleTokenRepository.findOne({
                where: { user_id: userId },
            });

            if (record) {
                record.access_token = tokens.access_token!;
                record.expires_at = expiresAt;
                record.scope = tokens.scope ?? this.BIGQUERY_SCOPE;
                // solo actualizar refresh_token si Google envía uno nuevo
                if (tokens.refresh_token) {
                    record.refresh_token = tokens.refresh_token;
                }
            } else {
                record = this.googleTokenRepository.create({
                    user_id: userId,
                    access_token: tokens.access_token!,
                    refresh_token: tokens.refresh_token ?? undefined,
                    expires_at: expiresAt,
                    scope: tokens.scope ?? this.BIGQUERY_SCOPE,
                });
            }

            return this.googleTokenRepository.save(record);
        } catch (error) {
            throw new InternalServerErrorException(
                `Error al obtener tokens de Google: ${(error as Error).message}`,
            );
        }
    }

    /** Obtiene un access_token válido para el usuario, renovando si es necesario */
    async getValidAccessToken(userId: number): Promise<string> {
        const record = await this.googleTokenRepository.findOne({
            where: { user_id: userId },
        });

        if (!record) {
            throw new UnauthorizedException(
                'No has conectado tu cuenta de Google. Usa /auth/google para autenticarte.',
            );
        }

        // si el token aún no expira, devolverlo directamente
        if (record.expires_at > new Date()) {
            return record.access_token;
        }

        // si no hay refresh_token, el usuario debe autenticarse de nuevo
        if (!record.refresh_token) {
            throw new UnauthorizedException(
                'Tu sesión de Google ha expirado. Vuelve a conectar tu cuenta.',
            );
        }

        // renovar el access_token usando el refresh_token
        try {
            this.oauth2Client.setCredentials({
                refresh_token: record.refresh_token,
            });

            const { credentials } = await this.oauth2Client.refreshAccessToken();

            record.access_token = credentials.access_token!;
            record.expires_at = new Date(
                credentials.expiry_date ?? Date.now() + 3600 * 1000,
            );

            await this.googleTokenRepository.save(record);

            return record.access_token;
        } catch (error) {
            throw new UnauthorizedException(
                'No se pudo renovar el token de Google. Vuelve a conectar tu cuenta.',
            );
        }
    }

    /** Verifica si el usuario tiene Google conectado */
    async isConnected(userId: number): Promise<boolean> {
        const record = await this.googleTokenRepository.findOne({
            where: { user_id: userId },
        });
        return !!record;
    }
}