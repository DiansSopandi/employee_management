import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { Employee } from './entities/employee.entity';
import { Payroll } from '../payroll/entities/payroll.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, Payroll])],
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}
