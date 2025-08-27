import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

export const createRedisThrottlerStorage = (configService: ConfigService) => {
  const redis = new Redis({
    host: configService.get('redis.host') || '127.0.0.1',
    port: configService.get('redis.port') || 6379,
    password: configService.get('redis.password'),
    db: configService.get('redis.db') || 0,
  });

  return new ThrottlerStorageRedisService(redis);
};
