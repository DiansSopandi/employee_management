import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { Employee } from './entities/employee.entity';
import { Payroll } from '../payroll/entities/payroll.entity';
import { RabbitMQModule } from '../rabbit-mq/rabbit-mq.module';
import { EmployeeConsumer } from './employee.consumer';
``;
@Module({
  imports: [TypeOrmModule.forFeature([Employee, Payroll]), RabbitMQModule],
  controllers: [EmployeesController, EmployeeConsumer],
  providers: [EmployeesService],
})
export class EmployeesModule {}
