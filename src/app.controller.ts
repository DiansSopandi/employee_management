import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { generateFakeSalaries } from './utils/fake-salary.utils';
import { Public } from './utils/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('mock-payroll')
  getMockSalaries() {
    return [
      {
        employeeId: 1,
        baseSalary: 5000,
        bonus: 300,
        month: '2025-03',
      },
      {
        employeeId: 2,
        baseSalary: 6000,
        bonus: 500,
        month: '2025-03',
      },
    ];
  }

  @Public()
  @Get('mock-fake-payroll')
  getMockFakePayroll(@Query('count') count = 10) {
    const fakeData = generateFakeSalaries(Number(count));
    return {
      status: 'success',
      data: fakeData,
    };
  }
}
