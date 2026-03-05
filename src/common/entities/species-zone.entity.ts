import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { StudyZone } from './study-zone.entity';
import { Species } from './species.entity';
import { UnitMeasurement } from './unit-measurement.entity';

@Entity('species_zone')
export class SpeciesZone {
    @PrimaryGeneratedColumn()
    species_zone_id: number;

    @Column({ nullable: false })
    study_zone_id: number;

    @ManyToOne(() => StudyZone, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn({ name: 'study_zone_id' })
    studyZone: StudyZone;

    @Column({ nullable: false })
    species_id: number;

    @ManyToOne(() => Species, { nullable: false })
    @JoinColumn({ name: 'species_id' })
    species: Species;

    @Column({ type: 'int', nullable: false })
    individual_count: number;

    @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true, default: null })
    height_stratum_min: number | null;

    @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true, default: null })
    height_stratum_max: number | null;

    @Column({ nullable: false })
    unit_id: number;

    @ManyToOne(() => UnitMeasurement, { nullable: false })
    @JoinColumn({ name: 'unit_id' })
    unitMeasurement: UnitMeasurement;

    @Column({ type: 'int', default: 1 })
    cycle_number: number;
}
