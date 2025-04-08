import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PayrollService } from '../integrations/payroll/payroll.service';

@Injectable()
export class PayrollTaskService {
  private readonly logger = new Logger(PayrollTaskService.name);

  constructor(private readonly payrollService: PayrollService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handlePayrollSync() {
    this.logger.log('Running payroll sync...');

    const payrollData = await this.payrollService.fetchPayrollData();
    // TODO: Save to DB or process here
    this.logger.debug(`Payroll Data: ${JSON.stringify(payrollData)}`);
  }

  @Cron('0 0 * * *') // Every day at midnight
  handleCron() {
    console.log('[Payroll Sync] Starting...');
    this.logger.log('Syncing fake payroll data...');
    this.payrollService.syncFakePayrollData();
  }
}
