import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Logger, VersioningType } from '@nestjs/common';
import { ApiDocs } from '@app/commons/api-docs/api-docs';
import { GlobalExceptionFilter } from './filters/http-exception.filter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ErrorCodeService } from 'src/features/error-code/error-code.service';
import * as session from 'express-session';
import * as passport from 'passport';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { AuditTrailService } from './audit-trail/audit-trail.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new Logger(),
    cors: true,
  });

  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(
    bodyParser.urlencoded({
      limit: '50mb',
      extended: true,
      parameterLimit: 50000,
    }),
  );

  const configService: ConfigService = app.get<ConfigService>(ConfigService);
  let port = configService.get('PORT');
  port = parseInt(port);
  const appName = configService.get('APP_NAME');
  const logger = new Logger(appName);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const loggerInstance = app.get(Logger);
  const errorCodeInstance = app.get(ErrorCodeService);
  app.useGlobalFilters(
    new GlobalExceptionFilter(loggerInstance, errorCodeInstance),
  );
  const auditRepository = app.get('AuditLogRepository');
  app.useGlobalInterceptors(
    new AuditInterceptor(
      new AuditTrailService(
        auditRepository,
        new Logger(AuditTrailService.name),
      ),
    ),
  );
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.enableCors({
    allowedHeaders: ['content-type'],
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.use(cookieParser());
  app.use(
    session({
      name: 'employeeSession',
      secret: configService.get('JWT_AT_SECRET'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: Number(configService.get('JWT_AT_COOKIE_EXP')),
        signed: true,
        httpOnly: true,
        path: '/',
        secure: false,
      },
      store: new session.MemoryStore(),
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  ApiDocs.setup(app, app.get(ConfigService));

  // ✅ Start microservice for consuming RabbitMQ messages
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://admin:admin@localhost:5672'],
      queue: 'employee_queue',
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices(); // ✅ Start microservices
  await app.listen(port);
  logger.log('Application running on port ' + port);
}
bootstrap();
