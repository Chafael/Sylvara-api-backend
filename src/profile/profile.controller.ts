import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Put,
    Patch,
    Request,
    UseGuards,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
    constructor(private readonly profileService: ProfileService) { }

    @Get()
    getProfile(@Request() req) {
        return this.profileService.getProfile(req.user.user_id);
    }

    @Patch()
    updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
        return this.profileService.updateProfile(req.user.user_id, dto);
    }

    @Put('password')
    @HttpCode(HttpStatus.OK)
    changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
        return this.profileService.changePassword(req.user.user_id, dto);
    }

    @Delete()
    @HttpCode(HttpStatus.OK)
    deleteProfile(@Request() req) {
        return this.profileService.deleteProfile(req.user.user_id);
    }
}
