import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  userId: number;

  @Column({ nullable: false })
  action: string; // CREATE, UPDATE, DELETE, LOGIN

  @Column({ nullable: false })
  entity: string; // Which entity was affected (e.g., 'Employee')

  @Column({ type: 'jsonb', nullable: true })
  oldData: any; // Store previous data before change

  @Column({ type: 'jsonb', nullable: true })
  newData: any; // Store new data after change

  @CreateDateColumn()
  timestamp: Date;
}
