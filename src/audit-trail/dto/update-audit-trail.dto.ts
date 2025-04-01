import { PartialType } from '@nestjs/swagger';
import { CreateAuditTrailDto } from './create-audit-trail.dto';

export class UpdateAuditTrailDto extends PartialType(CreateAuditTrailDto) {}
