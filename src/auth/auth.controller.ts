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
import { DataSource } from 'typeorm';
import { Req } from '@nestjs/common';
import { VerifyTwoFactorDto } from './dto/verify-two-factor.dto';
import { ToggleTwoFactorDto } from './dto/toggle-two-factor.dto';
import { JwtTwoFactorGuard } from './guards/jwt-two-factor.guard';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly googleOAuthService: GoogleOAuthService,
        @InjectDataSource() private readonly dataSource: DataSource,
    ) {}

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
        res.redirect('http://206.189.200.58/api/v1/health');
    }

    /** Verifica si el usuario tiene Google conectado */
    @Get('google/status')
    @UseGuards(JwtAuthGuard)
    async googleStatus(@Request() req: { user: { user_id: number } }) {
        const connected = await this.googleOAuthService.isConnected(req.user.user_id);
        return { connected };
    }

    /**
     * Recibe el serverAuthCode desde Flutter y lo canjea server-side
     * por access_token + refresh_token.
     *
     * Flutter debe obtener el serverAuthCode así:
     *   final GoogleSignIn _googleSignIn = GoogleSignIn(
     *     scopes: ['https://www.googleapis.com/auth/bigquery'],
     *     serverClientId: 'TU_WEB_CLIENT_ID',
     *   );
     *   final account = await _googleSignIn.signIn();
     *   final serverAuthCode = account?.serverAuthCode;
     */
    @Post('google/mobile')
    @UseGuards(JwtAuthGuard)
    async googleMobile(
        @Body() body: { serverAuthCode: string },
        @Request() req: { user: { user_id: number } },
    ) {
        const userId = req.user.user_id;
        await this.googleOAuthService.handleMobileCallback(body.serverAuthCode, userId);
        return { message: 'Google vinculado desde móvil', connected: true };
    }

    @Post('2fa/verify')
@HttpCode(HttpStatus.OK)
@UseGuards(JwtTwoFactorGuard)
verifyTwoFactor(
    @Body() dto: VerifyTwoFactorDto,
    @Request() req: { user: { user_id: number } },
) {
    return this.authService.verifyTwoFactor(req.user.user_id, dto);
}

@Post('2fa/toggle')
@HttpCode(HttpStatus.OK)
@UseGuards(JwtAuthGuard)
toggleTwoFactor(
    @Body() dto: ToggleTwoFactorDto,
    @Request() req: { user: { user_id: number } },
) {
    return this.authService.toggleTwoFactor(req.user.user_id, dto.enabled);
}
}