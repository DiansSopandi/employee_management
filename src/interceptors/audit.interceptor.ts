import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditTrailService } from '../audit-trail/audit-trail.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditTrailService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const method = request.method;
    const url = request.url;

    return next.handle().pipe(
      tap(async () => {
        if (userId) {
          await this.auditService.logChange('API_CALL', method, userId, {
            url,
          });
        }
      }),
    );
  }
}
