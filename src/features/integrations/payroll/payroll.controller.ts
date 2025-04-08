// payroll.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { SyncSalaryDto } from './dto/sync-salary.dto';
import { SyncSelectedPayrollDto } from './entities/synced-selected-payroll.dto';
import { Public } from 'src/utils/decorators/public.decorator';

@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('sync')
  syncSalary(@Body() dto: SyncSalaryDto) {
    return this.payrollService.syncSalary(dto);
  }

  @Post('sync-selected')
  //   async syncByIds(@Body('employeeIds') employeeIds: number[]) {
  async syncByIds(@Body() body: SyncSelectedPayrollDto) {
    return this.payrollService.syncSelectedSalaries(body.employeeIds);
  }
}
