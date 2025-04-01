import { Controller, Logger } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';

@Controller()
export class EmployeeConsumer {
  constructor(private readonly logger: Logger) {}
  // @MessagePattern('employee.created')
  @EventPattern('employee.created')
  async handleEmployeeCreated(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log('Processing new employee:', data);
    // Simulate processing the employee data
    // In a real application, you would perform actions like saving to a database,
    // sending emails, etc.
    // For example, you might want to send a welcome email to the new employee
    // or sync the employee data with a payroll system.
    // await this.saveEmployeeToDatabase(data);
    // await this.sendWelcomeEmail(data.email);
    // await this.syncWithPayroll(data);
    // Simulate saving to a database
    // In a real application, you would use a service to save the employee data
    // For example, using TypeORM or Mongoose to save the data
    // const employee = await this.employeeService.create(data);
    // Simulate sending a welcome email
    // In a real application, you would use a mail service to send the email
    // For example, using nodemailer or any other email service
    // const emailService = new EmailService();
    // await emailService.sendWelcomeEmail(data.email);
    // Simulate syncing with a payroll system
    // In a real application, you would make an API call to the payroll system
    // For example, using axios or fetch to send a request to the payroll API
    // const payrollService = new PayrollService();
    // await payrollService.syncWithPayroll(data);
    // Simulate processing the employee data
    // In a real application, you would perform actions like saving to a database,
    // sending emails, etc.
    await this.sendWelcomeEmail(data.email);
    await this.syncWithPayroll(data);

    this.logger.log('Employee processed successfully.');
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    channel.ack(originalMsg); // 👈 Acknowledge message after processing
  }

  async sendWelcomeEmail(email: string) {
    this.logger.log(`Sending welcome email to ${email}`);
    // Simulate sending email
    // In a real application, you would use a mail service to send the email
    // For example, using nodemailer or any other email service
    // const transporter = nodemailer.createTransport({
    //   service: 'gmail',
    //   auth: {
  }

  async syncWithPayroll(employee: any) {
    console.log(`Syncing ${employee.name} to payroll system`);
    this.logger.log(
      `Syncing ${employee.name} to payroll system with ID: ${employee.id}`,
    );
    // Simulate syncing with payroll system
    // In a real application, you would make an API call to the payroll system
    // For example, using axios or fetch to send a request to the payroll API
    // const response = await axios.post('https://payroll.example.com/sync', {
    //   employeeId: employee.id,
    //   name: employee.name,
  }
}
