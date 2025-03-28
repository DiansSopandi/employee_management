import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Module({
  imports: [
    ConfigModule,
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        winston.createLogger({
          transports: [
            new winston.transports.DailyRotateFile({
              level: configService.get<string>('LOG_LEVEL'), //'debug',
              filename: configService.get('LOG_FILENAME'), //'application-%DATE%.log',
              dirname: configService.get<string>('LOG_DIR'), //'./logs',
              datePattern: configService.get('LOG_DATEFORMAT'), //'YYYY-MM-DD',
              zippedArchive: configService.get('LOG_AUTOARCHIVE') === 'true', // true,
              maxFiles: configService.get('LOG_MAXFILE'), //'14d'
              maxSize: configService.get('LOG_MAXSIZE'), //'20m',
              format: winston.format.combine(
                winston.format.colorize({ all: false }),
                winston.format.timestamp({ format: 'DD/MM/YYYY HH:mm:ss' }),
                winston.format.ms(),
                nestWinstonModuleUtilities.format.nestLike(
                  configService.get('APP_NAME'),
                  { prettyPrint: true },
                ),
                winston.format.uncolorize(),
              ),
            }),
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.timestamp({ format: 'DD/MM/YYYY HH:mm:ss' }),
                winston.format.ms(),
                nestWinstonModuleUtilities.format.nestLike(
                  configService.get('APP_NAME'),
                  { prettyPrint: true },
                ),
              ),
            }),
          ],
          exitOnError: true,
        }),
      inject: [ConfigService],
    }),
  ],
})
export class LoggerModule {}
