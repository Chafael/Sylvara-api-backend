import { IsDateString, IsInt, IsNumber, IsPositive, Min } from 'class-validator';

export class CreateDailyMetricDto {
    @IsInt()
    @IsPositive()
    project_id: number;

    /** Fecha en formato ISO: YYYY-MM-DD */
    @IsDateString()
    snapshot_date: string;

    @IsInt()
    @Min(0)
    calls: number;

    @IsNumber({ maxDecimalPlaces: 4 })
    @Min(0)
    mean_exec_time_ms: number;
}
