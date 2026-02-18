import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    // POST /auth/register
    @Post('register')
    register(@Body() dto: RegisterUserDto) {
        return this.authService.register(dto);
    }

    // POST /auth/login
    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(@Body() dto: LoginUserDto) {
        return this.authService.login(dto);
    }
}
