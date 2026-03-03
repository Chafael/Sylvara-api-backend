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

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly googleOAuthService: GoogleOAuthService,
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

    @Get('me')
    @UseGuards(JwtAuthGuard)
    getMe(@Request() req: { user: { user_id: number } }) {
        return this.authService.getMe(req.user.user_id);
    }

    // ─── Google OAuth ────────────────────────────────────────

    /** Redirige al usuario a Google para autorizar BigQuery */
    @Get('google')
    @UseGuards(JwtAuthGuard)
    googleRedirect(
        @Request() req: { user: { user_id: number } },
        @Res() res: Response,
    ) {
        const url = this.googleOAuthService.getAuthUrl(req.user.user_id);
        res.redirect(url);
    }

    /** Callback de Google: intercambia code por tokens */
    @Get('google/callback')
    async googleCallback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Res() res: Response,
    ) {
        const userId = parseInt(state, 10);
        await this.googleOAuthService.handleCallback(code, userId);

        // redirigir al frontend con éxito
        res.redirect('http://localhost:3001/benchmarking?google=connected');
    }

    /** Verifica si el usuario tiene Google conectado */
    @Get('google/status')
    @UseGuards(JwtAuthGuard)
    async googleStatus(@Request() req: { user: { user_id: number } }) {
        const connected = await this.googleOAuthService.isConnected(req.user.user_id);
        return { connected };
    }
}