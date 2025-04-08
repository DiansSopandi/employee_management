// src/salary/entities/synced-salary.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('synced_salaries')
export class SyncedSalary {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  employeeId: number;

  @Column()
  name: string;

  @Column({ type: 'float' })
  baseSalary: number;

  @Column({ type: 'float' })
  bonus: number;

  @Column({ type: 'date' })
  period: string;

  @CreateDateColumn()
  syncedAt: Date;
}
