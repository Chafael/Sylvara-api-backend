import {
    BadRequestException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 10;
import { User } from '../auth/entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';

@Injectable()
export class ProfileService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    // convierte la entidad al DTO de respuesta
    private toResponse(user: User): ProfileResponseDto {
        return {
            id: user.user_id,
            name: user.user_name,
            lastname: user.user_lastname,
            birthday: user.user_birthday,
            email: user.user_email,
            pictureUrl: user.profile_picture_url,
            role: user.user_role,
        };
    }

    async getProfile(userId: number): Promise<ProfileResponseDto> {
        const user = await this.userRepository.findOne({ where: { user_id: userId } });
        if (!user) throw new NotFoundException('Usuario no encontrado.');
        return this.toResponse(user);
    }

    async updateProfile(userId: number, dto: UpdateProfileDto): Promise<ProfileResponseDto> {
        // verifica que el email no esté en uso por otro usuario
        if (dto.email) {
            const conflict = await this.userRepository.findOne({
                where: { user_email: dto.email },
            });
            if (conflict && conflict.user_id !== userId) {
                throw new BadRequestException('El correo ya está en uso por otra cuenta.');
            }
        }

        await this.userRepository.update(userId, {
            ...(dto.name && { user_name: dto.name }),
            ...(dto.lastname && { user_lastname: dto.lastname }),
            ...(dto.birthday && { user_birthday: new Date(dto.birthday) }),
            ...(dto.email && { user_email: dto.email }),
            ...(dto.pictureUrl !== undefined && { profile_picture_url: dto.pictureUrl }),
        });

        return this.getProfile(userId);
    }

    async changePassword(userId: number, dto: ChangePasswordDto): Promise<{ message: string }> {
        // se pide el password porque por defecto no se incluye
        const user = await this.userRepository.findOne({
            where: { user_id: userId },
            select: ['user_id', 'user_password'],
        });

        if (!user) throw new NotFoundException('Usuario no encontrado.');

        const isValid = await bcrypt.compare(dto.currentPassword, user.user_password);
        if (!isValid) throw new UnauthorizedException('La contraseña actual es incorrecta.');

        const hashed = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
        await this.userRepository.update(userId, { user_password: hashed });

        return { message: 'Contraseña actualizada exitosamente.' };
    }

    async deleteProfile(userId: number): Promise<{ message: string }> {
        const result = await this.userRepository.delete({ user_id: userId });
        if (!result.affected) throw new NotFoundException('Usuario no encontrado.');
        // la cascada en PostgreSQL elimina refresh_tokens y sampling_plots automáticamente
        return { message: 'Cuenta eliminada exitosamente.' };
    }
}
