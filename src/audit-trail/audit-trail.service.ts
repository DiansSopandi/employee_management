import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-trail.entity';

@Injectable()
export class AuditTrailService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    private readonly logger: Logger,
  ) {
    this.logger = new Logger(AuditTrailService.name);
  }

  async logChange(
    entity: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'UPDATE_ROLE',
    userId: number,
    oldData?: any,
    newData?: any,
  ) {
    try {
      const auditLog = this.auditRepository.create({
        userId,
        entity,
        action,
        oldData,
        newData,
      });

      await this.auditRepository.save(auditLog);
    } catch (error) {
      this.logger.error('Error logging audit trail', error);
    }
  }

  async getAuditLogs({
    userId,
    action,
    entity,
    startDate,
    endDate,
    page,
    limit,
  }: {
    userId?: number;
    action?: string;
    entity?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const query = this.auditRepository.createQueryBuilder('audit');

    if (userId) {
      query.andWhere('audit.userId = :userId', { userId });
    }
    if (action) {
      query.andWhere('audit.action = :action', { action });
    }
    if (entity) {
      query.andWhere('audit.entity = :entity', { entity });
    }
    if (startDate) {
      query.andWhere('audit.timestamp >= :startDate', {
        startDate: new Date(startDate),
      });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.andWhere('audit.timestamp <= :endDate', {
        endDate: end,
      });
    }

    return query
      .orderBy('audit.timestamp', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
  }
}
