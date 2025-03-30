import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import {
  ClientOptions,
  ClientProxy,
  ClientProxyFactory,
  RmqOptions,
  Transport,
} from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom, throwError } from 'rxjs';

@Injectable()
// export class RabbitMQService implements OnModuleInit {
export class RabbitMQService {
  private client: ClientProxy;

  constructor(
    private configService: ConfigService,
    // @Inject('RABBITMQ_SERVICE') private readonly client: ClientProxy,
  ) {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://admin:admin@localhost:5672'], // [this.configService.get<string>('RABBITMQ_URL')],
        queue: 'employee_queue', // this.configService.get<string>('RABBITMQ_QUEUE'),
        queueOptions: { durable: true },
        exchange: 'employee_exchange', // ✅ Allowed
        routingKey: 'employee.created', // ✅ Correct usage
      },
    } as ClientOptions);
  }

  //   async onModuleInit() {
  //     this.client = ClientProxyFactory.create({
  //       transport: Transport.RMQ,
  //       options: {
  //         urls: [this.configService.get<string>('RABBITMQ_URL')],
  //         queue: this.configService.get<string>('RABBITMQ_QUEUE'),
  //         queueOptions: { durable: true },
  //       },
  //     } as ClientOptions);

  //     await this.client.connect().catch((err) => {
  //       console.log({ error: err });
  //     });
  //   }

  async publishMessage(event: string, data: any) {
    try {
      return await firstValueFrom(
        this.client.emit(event, data).pipe(
          catchError((exception: Error) => {
            return throwError(() => new Error(exception.message));
          }),
        ),
      );
    } catch (error) {
      console.log(error);
    }
  }

  async sendMessageAndWait(data: any) {
    console.log(`📨 Sending message and waiting for response...`);
    return firstValueFrom(this.client.send('employee_created', data));
  }

  async consumeMessages() {
    console.log(`🎧 Listening for messages...`);
    this.client
      .send('employee.created', {})
      .subscribe((response) => console.log(`✅ Received response:`, response));
  }

  async onModuleDestroy() {
    await this.client.close();
    console.log('❌ RabbitMQ Connection Closed');
  }
}
