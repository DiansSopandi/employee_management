import { Global, Logger, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { getRedisConfig } from './cache.config';
import { redisStore } from 'cache-manager-redis-store';
import { CacheModule } from '@nestjs/cache-manager';

const logger = new Logger('RedisCacheModule');

@Global()
@Module({
  imports: [
    ConfigModule,
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = {
          store: redisStore,
          host: configService.get('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
          ttl: 600,
        };
        logger.warn(
          `Connecting to Redis at ${redisConfig.host}:${redisConfig.port}`,
        );
        return redisConfig;
      },
    }),
  ],
  providers: [
    CacheService,
    Logger,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const redisConfig = getRedisConfig(configService);
        const client = createClient({
          socket: {
            host: redisConfig.host,
            port: redisConfig.port,
          },
          password: redisConfig.password,
        });

        client.on('connect', () =>
          // console.log('✅ Connected to Redis')
          logger.warn('✅ Connected to Redis successfully'),
        );
        client.on('error', (err) =>
          // console.error('❌ Redis Connection Error:', err),
          logger.error('❌ Redis Connection Error:', err),
        );

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT', CacheService, CacheModule, Logger],
})
export class RedisCacheModule {}
