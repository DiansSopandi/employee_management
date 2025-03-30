import { Controller } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';

@Controller()
export class EmployeeConsumer {
  // @MessagePattern('employee.created')
  @EventPattern('employee.created')
  async handleEmployeeCreated(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    console.log('Processing new employee:', data);

    await this.sendWelcomeEmail(data.email);

    await this.syncWithPayroll(data);

    console.log('Employee processed successfully.');

    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    channel.ack(originalMsg); // 👈 Acknowledge message after processing
  }

  async sendWelcomeEmail(email: string) {
    console.log(`Sending welcome email to ${email}`);
  }

  async syncWithPayroll(employee: any) {
    console.log(`Syncing ${employee.name} to payroll system`);
  }
}
