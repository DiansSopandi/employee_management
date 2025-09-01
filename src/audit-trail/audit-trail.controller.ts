import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditTrailService } from './audit-trail.service';
import { AuthGuard } from '../features/auth/guards/auth.guard';
import { Roles } from '../utils/decorators/roles.decorator';
import { RoleGuard } from '../features/auth/guards/role.guard';
import EmployeeApi from 'src/utils/decorators/header.decorator';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@EmployeeApi('Audit Logs')
@Controller('audit-trail')
@Roles('admin', 'superadmin')
@UseGuards(AuthGuard, RoleGuard) // Protect with authentication & role guard
export class AuditTrailController {
  constructor(private readonly auditService: AuditTrailService) {}

  /**
   * Get audit logs with optional filtering (userId, action, entity, date range)
   */
  @Get()
  async getAuditLogs(@Query() query: AuditLogQueryDto) {
    const { userId, action, entity, startDate, endDate, page, limit } = query;
    return await this.auditService.getAuditLogs({
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
