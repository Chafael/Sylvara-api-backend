import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const ACTIVITY_TYPES = [
    // Auth
    'login', 'logout', 'register',
    // Navigation
    'viewDashboard', 'viewProjects', 'viewProjectDetail', 'viewZoneDetail',
    'viewSpeciesList', 'viewBenchmarking', 'viewProfile', 'viewExport', 'viewIndices',
    // Projects
    'createProject', 'updateProject', 'updateProjectStatus', 'deleteProject',
    // Zones
    'createZone', 'updateZone', 'deleteZone',
    // Species
    'createSpecies', 'updateSpecies', 'deleteSpecies',
    // Benchmarking
    'takeSnapshot', 'sendBigquery', 'downloadCsv', 'generateCsv', 'resetBenchmarking',
    // Export
    'exportReport',
    // Profile
    'updateProfile', 'changePassword', 'deleteAccount',
] as const;

export const RESOURCE_TYPES = ['project', 'zone', 'species'] as const;

export class CreateUserActivityDto {
    @IsString()
    @IsIn(ACTIVITY_TYPES)
    activity_type: string;

    @IsOptional()
    @IsString()
    @IsIn(RESOURCE_TYPES)
    resource_type?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    resource_id?: string;

    @IsOptional()
    metadata?: Record<string, any>;
}
