import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Redis } from 'ioredis';
import { CACHE_PREFIX, DEFAULT_TTL } from './cache.constants';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class CacheService implements OnModuleInit {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
    private readonly cacheManager: Cache,
    private readonly logger: Logger,
  ) {
    this.logger = new Logger(CacheService.name);
  }

  async onModuleInit() {
    try {
      await this.redisClient.connect();
      await this.cacheManager.set('test', 'test', 10);
      this.logger.warn('Redis is connected and working');
    } catch (error) {
      this.logger.error('Redis connection failed:', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redisClient.get(`${CACHE_PREFIX}${key}`);
    return data ? JSON.parse(data) : null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const data = JSON.stringify(value);
      await this.redisClient.set(
        `${CACHE_PREFIX}${key}`,
        data,
        'EX',
        ttl ?? DEFAULT_TTL,
      );
      this.logger.warn(`Cache set for key: ${CACHE_PREFIX}${key}`);
    } catch (error) {
      this.logger.error(
        `Error setting cache for key: ${CACHE_PREFIX}${key}`,
        error,
      );
      throw new Error(
        `Failed to set cache for key: ${CACHE_PREFIX}${key} - ${error.message}`,
      );
    }
  }

  async delete(key: string): Promise<void> {
    await this.redisClient.del(`${CACHE_PREFIX}${key}`);
  }
}
