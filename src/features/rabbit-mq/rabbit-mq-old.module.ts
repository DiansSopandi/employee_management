import { Logger, Module } from '@nestjs/common';
import {
  ClientProxyFactory,
  ClientsModule,
  Transport,
} from '@nestjs/microservices';

const logger = new Logger('RabbitMQ');
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'RABBITMQ_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://admin:admin@localhost:5672'],
          queue: 'employee_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  providers: [
    {
      provide: 'RABBITMQ_SERVICE',
      useFactory: () => {
        return ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: ['amqp://admin:admin@localhost:5672'],
            queue: 'employee_queue',
            queueOptions: { durable: true },
          },
        });
      },
    },
  ],
  exports: ['RABBITMQ_SERVICE'], // Export it for use in other modules
})
export class RabbitMQModuleOld {}
