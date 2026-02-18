import {
    BadRequestException,
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly jwtService: JwtService,
    ) { }

    // ───────────────────── REGISTER ─────────────────────
    async register(dto: RegisterUserDto): Promise<Omit<User, 'user_password'>> {
        const exists = await this.userRepository.findOne({
            where: { user_email: dto.user_email },
        });

        if (exists) {
            throw new ConflictException('El correo electrónico ya está registrado.');
        }

        const hashedPassword = await bcrypt.hash(dto.user_password, 10);

        const user = this.userRepository.create({
            user_name: dto.user_name,
            user_lastname: dto.user_lastname,
            user_birthday: new Date(dto.user_birthday),
            user_email: dto.user_email,
            user_password: hashedPassword,
        });

        const saved = await this.userRepository.save(user);

        // Exclude password from the returned object
        const { user_password: _pw, ...result } = saved as User & { user_password?: string };
        return result;
    }

    // ───────────────────── LOGIN ─────────────────────
    async login(dto: LoginUserDto): Promise<{ access_token: string }> {
        const user = await this.userRepository.findOne({
            where: { user_email: dto.user_email },
            select: ['user_id', 'user_email', 'user_password'],
        });

        if (!user) {
            throw new UnauthorizedException('Credenciales inválidas.');
        }

        const isValid = await bcrypt.compare(dto.user_password, user.user_password);

        if (!isValid) {
            throw new UnauthorizedException('Credenciales inválidas.');
        }

        const payload = { sub: user.user_id, email: user.user_email };
        const access_token = this.jwtService.sign(payload);

        return { access_token };
    }
}
