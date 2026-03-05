import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('functional_types')
export class FunctionalType {
    @PrimaryGeneratedColumn()
    functional_type_id: number;

    @Column({ nullable: false })
    functional_type_name: string;
}
