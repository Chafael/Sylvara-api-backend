import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    user_id: number;

    @Column({ nullable: false })
    user_name: string;

    @Column({ nullable: false })
    user_lastname: string;

    @Column({ type: 'date', nullable: false })
    user_birthday: Date;

    @Column({ unique: true, nullable: false })
    user_email: string;

    @Column({ nullable: false, select: false })
    user_password: string;

    // 'USER' o 'ADMIN' segun el contrato OpenAPI
    @Column({ default: 'USER' })
    user_role: string;
}
