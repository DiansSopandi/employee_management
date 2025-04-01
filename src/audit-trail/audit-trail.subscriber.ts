import { AuditTrailService } from './audit-trail.service';
import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
} from 'typeorm';
import { Injectable } from '@nestjs/common';

@Injectable()
@EventSubscriber()
export class AuditTrailSubscriber implements EntitySubscriberInterface {
  constructor(private readonly auditService: AuditTrailService) {}

  /**
   * Listen to entity updates and log changes
   */
  async beforeUpdate(event: UpdateEvent<any>) {
    if (!event.entity || !event.databaseEntity) return;

    await this.auditService.logChange(
      event.entity.constructor.name,
      'UPDATE',
      event.entity.id,
      event.databaseEntity, // Old data
      event.entity, // New data
    );
  }

  /**
   * Listen to entity deletions and log changes
   */
  async beforeRemove(event: RemoveEvent<any>) {
    if (!event.entity) return;

    await this.auditService.logChange(
      event.entity.constructor.name,
      'DELETE',
      event.entity.id,
      event.entity, // Old data
      null, // No new data for deletions
    );
  }
}
