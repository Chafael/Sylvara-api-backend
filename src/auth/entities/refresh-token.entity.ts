import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
    @PrimaryGeneratedColumn()
    token_id: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    user_id: number;

    @Column({ type: 'varchar', length: 512, nullable: false })
    token: string;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @Column({ type: 'timestamp', nullable: false })
    expires_at: Date;
}
