import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditTrailService } from './audit-trail.service';
import { AuthGuard } from '../features/auth/guards/auth.guard';
import { Roles } from '../utils/decorators/roles.decorator';
import { RoleGuard } from '../features/auth/guards/role.guard';
import EmployeeApi from 'src/utils/decorators/header.decorator';

@EmployeeApi('Audit Logs')
@Controller('audit-trail')
@Roles('admin')
@UseGuards(AuthGuard, RoleGuard) // Protect with authentication & role guard
export class AuditTrailController {
  constructor(private readonly auditService: AuditTrailService) {}

  /**
   * Get audit logs with optional filtering (userId, action, entity, date range)
   */
  @Get()
  async getAuditLogs(
    @Query('userId') userId?: number,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.auditService.getAuditLogs({
      userId,
      action,
      entity,
      startDate,
      endDate,
      page,
      limit,
    });
  }
}
