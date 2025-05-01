import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('chat_histories')
export class ChatHistories {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  session_id: string;

  @Column()
  to_number: string;

  @Column()
  message: string;

  @Column({ default: 'text' })
  type: string;

  @Column({ default: 'sent' })
  status: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
