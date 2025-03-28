import { Module } from '@nestjs/common';
import {
  ClientProxyFactory,
  ClientsModule,
  Transport,
} from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'RABBITMQ_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'], // RabbitMQ connection URL
          queue: 'employee_queue', // Define queue name
          queueOptions: { durable: true }, // Ensure messages are persistent
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
            urls: ['amqp://localhost:5672'],
            queue: 'employee_queue',
            queueOptions: { durable: true },
          },
        });
      },
    },
  ],
  exports: ['RABBITMQ_SERVICE'], // Export it for use in other modules
})
export class RabbitMQModule {}
