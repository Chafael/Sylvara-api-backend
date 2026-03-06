import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { UnitMeasurement } from './unit-measurement.entity';

export enum PlotStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
}

@Entity('sampling_plots')
export class SamplingPlot {
    @PrimaryGeneratedColumn()
    sampling_plot_id: number;

    @Column({ nullable: false })
    user_id: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ nullable: false })
    sampling_plot_name: string;

    @Column({ type: 'text', nullable: true, default: null })
    description: string | null;

    @Column({ type: 'numeric', precision: 10, scale: 2, nullable: false })
    total_area: number;

    @Column({ nullable: false })
    unit_id: number;

    @ManyToOne(() => UnitMeasurement, { nullable: false })
    @JoinColumn({ name: 'unit_id' })
    unitMeasurement: UnitMeasurement;

    @Column({
        type: 'varchar',
        default: PlotStatus.ACTIVE,
    })
    sampling_plot_status: PlotStatus;

    @Column({ type: 'int', default: 1 })
    current_cycle_number: number;

    @Column({ type: 'date', nullable: false, default: () => 'CURRENT_DATE' })
    start_date: Date;

    @Column({ type: 'date', nullable: true, default: null })
    end_date: Date | null;
}
