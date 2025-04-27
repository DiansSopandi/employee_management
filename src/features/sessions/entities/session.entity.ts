import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { UsersEntity } from '../../users/entities/user.entity';

@Entity('whatsapp_sessions')
export class WhatsAppSessionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  sessionId: string;

  @Column({ nullable: true })
  userId: number;

  @OneToOne(() => UsersEntity, (user) => user.session)
  @JoinColumn({ name: 'user_id' })
  user: UsersEntity;

  @Column({ default: 'PENDING' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
