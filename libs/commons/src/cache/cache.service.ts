import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Redis } from 'ioredis';
import { CACHE_PREFIX, DEFAULT_TTL } from './cache.constants';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class CacheService implements OnModuleInit {
  // private readonly redisClientType: RedisClientType;
  // private readonly redisClient: Redis;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
    private readonly cacheManager: Cache,
    private readonly logger: Logger,
  ) {
    // this.redisClientType = createClient({
    //   socket: {
    //     host: process.env.REDIS_HOST || 'localhost',
    //     port: Number(process.env.REDIS_PORT) || 6379,
    //   },
    // });
    // this.redisClientType = new Redis({
    //   host: process.env.REDIS_HOST || 'localhost',
    //   port: Number(process.env.REDIS_PORT) || 6379,
    //   password: process.env.REDIS_PASSWORD || '',
    // });
  }

  async onModuleInit() {
    try {
      // await this.redisClientType.connect();
      await this.redisClient.connect();
      await this.cacheManager.set('test', 'test', 10);
      this.logger.log('Redis is connected and working');
    } catch (error) {
      this.logger.error('Redis connection failed:', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redisClient.get(`${CACHE_PREFIX}${key}`);
    return data ? JSON.parse(data) : null;
    // return await this.cacheManager.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const data = JSON.stringify(value);
    await this.redisClient.setex(
      `${CACHE_PREFIX}${key}`,
      ttl ?? DEFAULT_TTL,
      data,
    );
  }

  async delete(key: string): Promise<void> {
    await this.redisClient.del(`${CACHE_PREFIX}${key}`);
  }
}
