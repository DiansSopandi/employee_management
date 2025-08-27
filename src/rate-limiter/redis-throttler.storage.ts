import { Injectable } from '@nestjs/common';
// import { ThrottlerStorage } from '@nestjs/throttler';
// import { ThrottlerStorageRecordLocal as ThrottlerStorageRecord } from './throttler-types';
import { Redis } from 'ioredis';

export interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
}

@Injectable()
// export class RedisThrottlerStorage implements ThrottlerStorage {
export class RedisThrottlerStorage {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const now = Date.now();
    const expiresAt = Math.ceil((now + ttl * 1000) / 1000);

    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, ttl);
    }

    return {
      totalHits: count,
      timeToExpire: expiresAt,
    };
  }
}
