import { Expose, Transform } from 'class-transformer';

export class ProjectResponseDto {
    @Expose()
    @Transform(({ obj }) => obj._id?.toString())
    id: string;

    @Expose()
    name: string;

    @Expose()
    description: string;

    @Expose()
    status: string;

    @Expose()
    image: string;

    @Expose()
    totalArea: number;

    @Expose()
    unitId: number;

    @Expose()
    startDate: Date;

    @Expose()
    endDate: Date;
}
