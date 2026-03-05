import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { SamplingPlot } from './sampling-plot.entity';
import { UnitMeasurement } from './unit-measurement.entity';

@Entity('studies_zones')
export class StudyZone {
    @PrimaryGeneratedColumn()
    study_zone_id: number;

    @Column({ nullable: false })
    sampling_plot_id: number;

    @ManyToOne(() => SamplingPlot, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn({ name: 'sampling_plot_id' })
    samplingPlot: SamplingPlot;

    @Column({ nullable: false })
    name_study_zone: string;

    @Column({ type: 'numeric', precision: 10, scale: 2, nullable: false })
    sub_area: number;

    @Column({ nullable: false })
    unit_id: number;

    @ManyToOne(() => UnitMeasurement, { nullable: false })
    @JoinColumn({ name: 'unit_id' })
    unitMeasurement: UnitMeasurement;

    @Column({ type: 'int', default: 1 })
    cycle_number: number;
}
