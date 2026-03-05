import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';

@Module({
    imports: [TypeOrmModule.forFeature([User])],
    controllers: [ProfileController],
    providers: [ProfileService],
})
export class ProfileModule { }
