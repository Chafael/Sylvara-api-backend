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

    @Column({ type: 'varchar', length: 512, nullable: true, default: null })
    profile_picture_url: string | null;

    @Column({ default: 'USER' })
    user_role: string;

    @Column({ default: false })
    two_factor_enabled: boolean;

    @Column({ type: 'varchar', length: 6, nullable: true, default: null, select: false })
    two_factor_code: string | null;

    @Column({ type: 'timestamp', nullable: true, default: null, select: false })
    two_factor_expires_at: Date | null;
}