import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { Payroll } from '../payroll/entities/payroll.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,

    @InjectRepository(Payroll)
    private readonly payrollRepository: Repository<Payroll>,

    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateEmployeeDto) {
    return this.dataSource.transaction(async (manager) => {
      const employee = manager.create(Employee, dto);
      await manager.save(employee);

      const payroll = manager.create(Payroll, {
        employeeId: employee.id,
        salary: dto.salary,
      });
      await manager.save(payroll);

      return employee;
    });
  }

  async getEmployeeById(id: number) {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['payroll'],
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return employee;
  }

  async updateEmployee(id: number, dto: Partial<CreateEmployeeDto>) {
    await this.employeeRepository.update(id, dto);
    return this.getEmployeeById(id);
  }

  async terminateEmployee(id: number) {
    const employee = await this.getEmployeeById(id);
    employee.isActive = false;
    await this.employeeRepository.save(employee);
    return { message: `Employee ${id} terminated successfully` };
  }
}
