import { applyDecorators, SetMetadata } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

// this decorator to override normal rate limiter
// High security endpoints (login, reset password)
export const StrictRateLimit = () =>
  applyDecorators(
    Throttle({
      short: { limit: 5, ttl: 60000 }, // 5 per minute
      medium: { limit: 10, ttl: 300000 }, // 10 per 5 minutes
    }),
    SetMetadata('rate-limit-type', 'strict'),
  );

// API endpoints
export const ApiRateLimit = () =>
  applyDecorators(
    Throttle({
      short: { limit: 30, ttl: 60000 }, // 30 per minute
      medium: { limit: 200, ttl: 300000 }, // 200 per 5 minutes
    }),
    SetMetadata('rate-limit-type', 'api'),
  );

// Public endpoints
export const PublicRateLimit = () =>
  applyDecorators(
    Throttle({
      short: { limit: 10, ttl: 60000 }, // 10 per minute
      medium: { limit: 50, ttl: 300000 }, // 50 per 5 minutes
    }),
    SetMetadata('rate-limit-type', 'public'),
  );

// File upload endpoints
export const UploadRateLimit = () =>
  applyDecorators(
    Throttle({
      short: { limit: 3, ttl: 60000 }, // 3 per minute
      medium: { limit: 10, ttl: 300000 }, // 10 per 5 minutes
    }),
    SetMetadata('rate-limit-type', 'upload'),
  );
