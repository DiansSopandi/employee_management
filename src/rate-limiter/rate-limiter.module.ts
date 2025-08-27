import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { createRateLimiterConfig } from 'src/config/rate-limiter.config';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ThrottlerModuleOptions => {
        return {
          ...createRateLimiterConfig(configService),
          // storage: createRedisThrottlerStorage(configService), //createRedisThrottlerStorage(configService),
        };
      },
    }),
  ],
})
export class RateLimiterModule {}
