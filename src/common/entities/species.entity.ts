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
    @PrimaryGeneratedColumn({ name: 'species_id' })
    speciesId: number;

    @Column({ name: 'species_name', nullable: false })
    speciesName: string;

    @Column({ name: 'species_image_url', type: 'varchar', length: 512, nullable: true, default: null })
    speciesImageUrl: string | null;

    @Column({ name: 'functional_type_id', nullable: false })
    functionalTypeId: number;

    @ManyToOne(() => FunctionalType, { nullable: false })
    @JoinColumn({ name: 'functional_type_id' })
    functionalType: FunctionalType;
}
