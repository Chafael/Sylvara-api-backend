import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsOptional,
    IsNumber,
    IsPositive,
    IsInt,
} from 'class-validator';
import { ProjectStatus } from '../../../common/constants/project-status.enum';

export class CreateProjectDto {
    @IsString()
    @IsNotEmpty()
    project_name: string;

    @IsEnum(ProjectStatus)
    @IsOptional()
    project_status?: ProjectStatus;

    @IsNumber()
    @IsPositive()
    total_area: number;

    @IsString()
    @IsNotEmpty()
    unit_name: string;

    @IsInt()
    user_id: number;

    @IsString()
    @IsOptional()
    description?: string;
}
