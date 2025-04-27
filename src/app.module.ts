import { Logger, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { yamlConfigLoader } from './config/config-loader';
import { FeaturesModule } from './features/features.module';
import { LoggerModule } from '@app/commons/logger/logger.modules';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './features/auth/guards/jwt-auth.guard';
import { EmployeeConsumer } from './features/employees/employee.consumer';
import { RedisCacheModule } from '@app/commons';
import { AuditTrailModule } from './audit-trail/audit-trail.module';
import { SessionsModule } from './features/sessions/sessions.module';

@Module({
  imports: [
    RedisCacheModule,
    AuditTrailModule,
    ConfigModule.forRoot({
      envFilePath: '.env',
      expandVariables: true,
      isGlobal: true,
      load: [yamlConfigLoader],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // return configService.get<TypeOrmModuleOptions>('database');

        const dbConfig = configService.get<TypeOrmModuleOptions>('database');
        if (!dbConfig) {
          throw new Error('Database configuration is missing!');
        }
        return dbConfig;
      },
      inject: [ConfigService],
    }),
    FeaturesModule,
    LoggerModule,
    AuditTrailModule,
    SessionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ConfigService,
    Logger,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    EmployeeConsumer,
  ],
})
export class AppModule {}
