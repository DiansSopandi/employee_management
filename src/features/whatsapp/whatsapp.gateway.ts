import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { WhatsappService } from './whatsapp.service';
import { QrThrottleService } from './qr-throttle.service';

@WebSocketGateway({
  cors: { origin: '*' }, // Untuk testing bebas origin dulu
})
export class WhatsappGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly qrThrottleService: QrThrottleService,
  ) {}

  afterInit() {
    this.whatsappService.setSocketServer(this.server);
  }

  //   this @SubscribeMessage will listen Socket.emit('start-client')
  @SubscribeMessage('start-client')
  async handleStartClient(client: any, payload: { userId: string }) {
    const { userId } = payload;

    if (!this.qrThrottleService.canRequest(userId)) {
      console.log(`QR request ignored for user ${userId} due to cooldown`);
      return; // abaikan jika masih dalam cooldown
    }

    await this.whatsappService.createClient(userId);
  }
}
