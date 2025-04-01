import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { Payroll } from '../payroll/entities/payroll.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ClientProxy } from '@nestjs/microservices';
import { RabbitMQService } from '../rabbit-mq/rabbit-mq.service';
import { CacheService } from '@app/commons';

@Injectable()
export class EmployeesService {
  constructor(
    // @Inject('RABBITMQ_SERVICE') private readonly client: ClientProxy,

    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,

    @InjectRepository(Payroll)
    private readonly payrollRepository: Repository<Payroll>,

    private readonly dataSource: DataSource,
    private readonly rabbitMQService: RabbitMQService,
    private readonly cacheService: CacheService,
    private readonly logger: Logger,
  ) {
    this.logger = new Logger(EmployeesService.name);
  }

  async create(dto: CreateEmployeeDto) {
    return this.dataSource.transaction(async (manager) => {
      const employee = manager.create(Employee, dto);
      await manager.save(employee);

      const payload = {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        position: employee.position,
        salary: employee.salary,
        isActive: employee.isActive,
        createdAt: employee.createdAt.toISOString(), // ✅ Ensure date is serializable
      };

      const payroll = manager.create(Payroll, {
        employeeId: employee.id,
        salary: dto.salary,
      });
      await manager.save(payroll);

      // this.client.emit('employee.created', employee);
      this.rabbitMQService.publishMessage('employee.created', employee);

      return employee;
    });
  }

  async getEmployeeById(id: number) {
    const cachedEmployee = await this.getCacheEmployeeProfile(id); // Cache the employee profile
    if (cachedEmployee) return cachedEmployee;

    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['payroll'],
    });

    if (!employee)
      throw new NotFoundException(`Employee with ID ${id} not found`);

    const cacheKey = `employee:${id}`;
    await this.cacheService.set(cacheKey, employee, 3600);
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

  async getCacheEmployeeProfile(employeeId: number): Promise<Employee | null> {
    const cacheKey = `employee:${employeeId}`;
    const cachedEmployee = await this.cacheService.get<Employee>(cacheKey);
    if (cachedEmployee) {
      this.logger.log(
        `Cache hit for employee ID ${employeeId}: ${JSON.stringify(cachedEmployee)}`,
      );
      return cachedEmployee;
    }

    // Store in Redis
    // await this.cacheService.set(cacheKey, employee, 3600);
    return null;
  }
}
