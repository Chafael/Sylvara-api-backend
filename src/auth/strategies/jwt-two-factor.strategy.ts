import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface TwoFactorPayload {
    sub: number;
    email: string;
    scope: '2fa_pending';
}

@Injectable()
export class JwtTwoFactorStrategy extends PassportStrategy(Strategy, 'jwt-2fa') {
    constructor(configService: ConfigService) {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET no está definido.');
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(payload: TwoFactorPayload) {
        if (payload.scope !== '2fa_pending') {
            throw new UnauthorizedException('Token inválido para este endpoint.');
        }
        return { user_id: payload.sub, user_email: payload.email };
    }
}