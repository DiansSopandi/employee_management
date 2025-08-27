import { ConfigService } from '@nestjs/config';
import { ThrottlerOptions, ThrottlerModuleOptions } from '@nestjs/throttler';

export interface NamedThrottlerOptions extends ThrottlerOptions {
  name?: string;
}

export const createRateLimiterConfig = (
  configService: ConfigService,
): ThrottlerModuleOptions => ({
  throttlers: [
    { name: 'short', ttl: 60000, limit: 10 },
    { name: 'medium', ttl: 300000, limit: 100 },
    { name: 'long', ttl: 3600000, limit: 1000 },
  ],
  skipIf: (context) => {
    // Skip rate limiting untuk health check atau internal calls
    const request = context.switchToHttp().getRequest();
    return request.url === '/health' || request.headers['x-internal-call'];
  },
});
