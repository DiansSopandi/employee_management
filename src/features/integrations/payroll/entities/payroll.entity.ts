import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from '../../../employees/entities/employee.entity';

@Entity()
export class Payroll {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  employeeId: number;

  @Column()
  salary: number;

  @Column({ default: new Date() })
  lastPaidDate: Date;

  @OneToOne(() => Employee)
  @JoinColumn()
  employee: Employee;
}
