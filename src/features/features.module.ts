import { Module } from '@nestjs/common';
import { ErrorCodeModule } from './error-code/error-code.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PassportModule } from '@nestjs/passport';
import { EmployeesModule } from './employees/employees.module';
import { PayrollService } from './payroll/payroll.service';
import { PayrollModule } from './payroll/payroll.module';

@Module({
  imports: [
    ErrorCodeModule,
    UsersModule,
    AuthModule,
    PassportModule.register({ session: true }),
    EmployeesModule,
    PayrollModule,
  ],
  exports: [FeaturesModule],
  providers: [PayrollService],
})
export class FeaturesModule {}
