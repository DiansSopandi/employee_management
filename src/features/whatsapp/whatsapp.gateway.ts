import {
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WhatsappService } from './whatsapp.service';
import { QrThrottleService } from './qr-throttle.service';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@nestjs/common';
import * as cookie from 'cookie';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({
  cors: { origin: '*' }, // Untuk testing bebas origin dulu
})
export class WhatsappGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WhatsappGateway.name);
  private token: string | undefined;

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly qrThrottleService: QrThrottleService,
  ) {}

  afterInit() {
    this.whatsappService.setSocketServer(this.server);
  }

  async handleConnection(client: Socket) {
    const cookieHeader = client.handshake.headers.cookie;
    // if (!cookieHeader) {
    //   client.disconnect();
    //   return;
    // }

    const cookies = cookie.parse(cookieHeader || '');
    this.token = cookies['jwt_at'] ?? '';

    // try {
    //   const payload = jwt.verify(token, process.env.JWT_SECRET);
    //   client.data.user = payload; // simpan user di client socket
    //   console.log(`User ${payload.sub} connected via WebSocket`);
    // } catch (error) {
    //   this.logger.error('Invalid token', error.stack);
    //   client.emit('error', { message: 'Authentication failed' });
    //   client.disconnect();
    // }
  }

  //   this @SubscribeMessage will listen Socket.emit('start-client')
  @SubscribeMessage('start-client')
  async handleStartClient(client: any, payload: { userId: string }) {
    const { userId } = payload;

    if (!this.qrThrottleService.canRequest(userId)) {
      this.logger.warn(`QR request ignored for user ${userId} due to cooldown`);
      return;
    }

    await this.whatsappService.createClient(userId, this.token);
  }
}
