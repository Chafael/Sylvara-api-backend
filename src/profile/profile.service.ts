import {
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../auth/entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { PROJECT_CONSTANTS } from '../common/constants/project-constants';

@Injectable()
export class ProfileService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly configService: ConfigService,
    ) { }

    // convierte la entidad al DTO de respuesta
    private toResponse(user: User): ProfileResponseDto {
        return {
            userId: user.user_id,
            userName: user.user_name,
            userLastname: user.user_lastname,
            userBirthday: user.user_birthday,
            userEmail: user.user_email,
            profilePictureUrl: user.profile_picture_url ?? null,
            userRole: user.user_role,
        };
    }

    async getProfile(userId: number): Promise<ProfileResponseDto> {
        const user = await this.userRepository.findOne({ where: { user_id: userId } });
        if (!user) throw new NotFoundException('Usuario no encontrado.');
        return this.toResponse(user);
    }

    async updateProfile(userId: number, dto: UpdateProfileDto): Promise<ProfileResponseDto> {
        if (dto.userEmail) {
            const conflict = await this.userRepository.findOne({
                where: { user_email: dto.userEmail },
            });
            if (conflict && conflict.user_id !== userId) {
                throw new ConflictException('El correo ya está en uso por otra cuenta.');
            }
        }

        await this.userRepository.update(userId, {
            ...(dto.userName && { user_name: dto.userName }),
            ...(dto.userLastname && { user_lastname: dto.userLastname }),
            ...(dto.userBirthday && { user_birthday: new Date(dto.userBirthday) }),
            ...(dto.userEmail && { user_email: dto.userEmail }),
            ...(dto.profilePictureUrl !== undefined && { profile_picture_url: dto.profilePictureUrl }),
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

        const saltRoundsStr = this.configService.get<string>('BCRYPT_SALT_ROUNDS') ?? 
                             PROJECT_CONSTANTS.DEFAULT_BCRYPT_SALT_ROUNDS.toString();
        const saltRounds = parseInt(saltRoundsStr, 10);
        const hashed = await bcrypt.hash(dto.newPassword, saltRounds);
        await this.userRepository.update(userId, { user_password: hashed });

        return { message: 'Contraseña actualizada exitosamente.' };
    }

    async deleteProfile(userId: number): Promise<void> {
        const result = await this.userRepository.delete({ user_id: userId });
        if (!result.affected) throw new NotFoundException('Usuario no encontrado.');
    }
}
