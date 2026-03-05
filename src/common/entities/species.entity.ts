import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { FunctionalType } from './functional-type.entity';

@Entity('species')
export class Species {
    @PrimaryGeneratedColumn()
    species_id: number;

    @Column({ nullable: false })
    species_name: string;

    @Column({ type: 'varchar', nullable: true, default: null })
    species_image_url: string | null;

    @Column({ nullable: false })
    functional_type_id: number;

    @ManyToOne(() => FunctionalType, { nullable: false })
    @JoinColumn({ name: 'functional_type_id' })
    functionalType: FunctionalType;
}
