import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('daily_query_metrics')
export class DailyMetric {
    @PrimaryGeneratedColumn()
    metric_id: number;

    @Column({ nullable: false })
    project_id: number;

    @Column({ type: 'date', nullable: false })
    snapshot_date: string;

    @Column({ type: 'integer', nullable: false })
    calls: number;

    @Column({ type: 'decimal', precision: 12, scale: 4, nullable: false })
    mean_exec_time_ms: number;
}
