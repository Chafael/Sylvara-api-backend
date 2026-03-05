import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('unit_measurement')
export class UnitMeasurement {
    @PrimaryGeneratedColumn()
    unit_id: number;

    @Column({ nullable: false })
    unit_name: string;
}
