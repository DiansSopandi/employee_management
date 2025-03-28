import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class EmployeeConsumer {
  @MessagePattern('employee.created')
  async handleEmployeeCreated(@Payload() data: any) {
    console.log('Processing new employee:', data);

    await this.sendWelcomeEmail(data.email);

    await this.syncWithPayroll(data);

    console.log('Employee processed successfully.');
  }

  async sendWelcomeEmail(email: string) {
    console.log(`Sending welcome email to ${email}`);
  }

  async syncWithPayroll(employee: any) {
    console.log(`Syncing ${employee.name} to payroll system`);
  }
}
