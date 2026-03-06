import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Query,
    Request,
    Res,
    UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleOAuthService } from 'src/benchmarking/services/google-oauth.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Req } from '@nestjs/common';
import { GoogleToken } from 'src/benchmarking/entities/google-token.entity';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly googleOAuthService: GoogleOAuthService,
        private readonly configService: ConfigService,
        @InjectDataSource() private readonly dataSource: DataSource,
    ) { }

    @Post('register')
    register(@Body() dto: RegisterUserDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(@Body() dto: LoginUserDto) {
        return this.authService.login(dto);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    refresh(@Body() dto: RefreshTokenDto) {
        return this.authService.refresh(dto.refreshToken);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    logout(@Body() dto: RefreshTokenDto) {
        return this.authService.logout(dto.refreshToken);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    getMe(@Request() req: { user: { user_id: number } }) {
        return this.authService.getMe(req.user.user_id);
    }

    // ─── Google OAuth ────────────────────────────────────────

    /** Redirige al usuario a Google para autorizar BigQuery */
    @Get('google')
    googleRedirect(
        @Query('token') token: string,
        @Res() res: Response,
    ) {
        if (!token) {
            res.status(401).json({ message: 'Se requiere el query param ?token=TU_JWT' });
            return;
        }

        // decodificar el JWT manualmente para obtener el userId
        const payload = JSON.parse(
            Buffer.from(token.split('.')[1], 'base64').toString(),
        );

        const url = this.googleOAuthService.getAuthUrl(payload.sub);
        res.redirect(url);
    }

    /** Callback de Google: intercambia code por tokens */
    @Get('callback')
    async googleCallback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Res() res: Response,
    ) {
        const userId = parseInt(state, 10);
        await this.googleOAuthService.handleCallback(code, userId);

        // redirigir al frontend con éxito
        const successUrl = this.configService.get<string>('GOOGLE_SUCCESS_REDIRECT')
            ?? 'http://localhost:3001/benchmarking?google=connected';
        res.redirect(successUrl);

    }

    /** Verifica si el usuario tiene Google conectado */
    @Get('google/status')
    @UseGuards(JwtAuthGuard)
    async googleStatus(@Request() req: { user: { user_id: number } }) {
        const connected = await this.googleOAuthService.isConnected(req.user.user_id);
        return { connected };
    }

    @Post('google/mobile')
    @UseGuards(JwtAuthGuard)
    async googleMobile(
        @Body() body: { access_token: string; email: string },
        @Req() req: any,
    ) {
        const userId = req.user.sub;

        // Guardar el access_token directamente en google_tokens
        const existing = await this.googleOAuthService.isConnected(userId);

        const repo = this.dataSource.getRepository(GoogleToken);

        await repo.upsert(
            {
                user: { user_id: userId },
                access_token: body.access_token,
                refresh_token: undefined,
                expires_at: new Date(Date.now() + 3600 * 1000),
                scope: this.googleOAuthService.BIGQUERY_SCOPE,
            },
            ['user'],
        );

        return { message: 'Google vinculado desde móvil', connected: true };
    }
}