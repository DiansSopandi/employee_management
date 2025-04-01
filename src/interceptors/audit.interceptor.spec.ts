import { AuditInterceptor } from './audit.interceptor';
import { AuditTrailService } from '../audit-trail/audit-trail.service';

describe('AuditInterceptor', () => {
  it('should be defined', () => {
    const mockAuditTrailService = {} as AuditTrailService;
    expect(new AuditInterceptor(mockAuditTrailService)).toBeDefined();
  });
});
