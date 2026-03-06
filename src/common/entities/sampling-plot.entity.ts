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
    @PrimaryGeneratedColumn({ name: 'sampling_plot_id' })
    samplingPlotId: number;

    @Column({ name: 'user_id', nullable: false })
    userId: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'sampling_plot_name', nullable: false })
    samplingPlotName: string;

    @Column({ type: 'text', nullable: true, default: null })
    description: string | null;

    @Column({ name: 'total_area', type: 'numeric', precision: 10, scale: 2, nullable: false })
    totalArea: number;

    @Column({ name: 'unit_id', nullable: false })
    unitId: number;

    @ManyToOne(() => UnitMeasurement, { nullable: false })
    @JoinColumn({ name: 'unit_id' })
    unitMeasurement: UnitMeasurement;

    @Column({
        name: 'sampling_plot_status',
        type: 'varchar',
        default: PlotStatus.ACTIVE,
    })
    samplingPlotStatus: PlotStatus;

    @Column({ name: 'current_cycle_number', type: 'int', default: 1 })
    currentCycleNumber: number;

    @Column({ name: 'start_date', type: 'date', nullable: false, default: () => 'CURRENT_DATE' })
    startDate: Date;

    @Column({ name: 'end_date', type: 'date', nullable: true, default: null })
    endDate: Date | null;
}
