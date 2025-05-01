import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('whatsapp_instances')
export class WhatsappInstanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  uuid: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  waId: string;

  @Column()
  status: 'INITIATED' | 'CONNECTED' | 'DISCONNECTED' | 'FAILED';

  @Column({ type: 'jsonb', nullable: true })
  clientInfo: any;

  @Column({ type: 'jsonb', nullable: true })
  sessionData: any;

  @Column({ type: 'timestamp', nullable: true })
  lastConnected: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
