import {
  ConnectedSocket,
  MessageBody,
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
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  cors: { origin: '*' }, // Untuk testing bebas origin dulu
})
export class WhatsappGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WhatsappGateway.name);
  private readonly qrRequestCooldown: Map<string, number> = new Map();
  private readonly COOLDOWN_PERIOD = 5000; // 5 seconds
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

    const cookies = cookie.parse(cookieHeader || '');
    this.token = cookies['jwt_at'] ?? '';
  }

  //   this @SubscribeMessage will listen Socket.emit('start-client')
  @SubscribeMessage('start-client')
  // async handleStartClient(client: any, payload: { userId: string }) {
  async handleStartClient(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // const { userId } = payload;
    const { userId } = data;

    // Implement cooldown to prevent rapid requests
    const now = Date.now();
    const lastRequest = this.qrRequestCooldown.get(userId) || 0;

    if (!this.qrThrottleService.canRequest(userId)) {
      this.logger.warn(`QR request ignored for user ${userId} due to cooldown`);
      return;
    }

    // Update cooldown timestamp
    this.qrRequestCooldown.set(userId, now);

    try {
      const result = await this.whatsappService.startClient(userId);

      if (result.success) {
        // QR code already emitted via event handler if available
        if (!result.qrCode) {
          client.emit('status', {
            userId,
            status: 'authenticated',
            message: result.message,
          });
        }
      } else {
        client.emit('error', {
          userId,
          type: 'start-failed',
          message: result.message,
        });
      }
    } catch (error) {
      this.logger.error(
        `Error handling start-client for ${userId}: ${error.message}`,
      );
      client.emit('error', {
        userId,
        type: 'error',
        message: 'Failed to start WhatsApp client',
      });
    }

    // await this.whatsappService.createClient(userId, this.token);
  }

  @SubscribeMessage('check-status')
  handleCheckStatus(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId } = data;
    const state = this.whatsappService.getClientState(userId);

    client.emit('status', {
      userId,
      exists: state.exists,
      status: state.status ?? 'not_initialized',
    });
  }

  @SubscribeMessage('reset-client')
  async handleResetClient(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId } = data;

    try {
      await this.whatsappService.resetAndRestartClient(userId);
      client.emit('status', {
        userId,
        status: 'resetting',
        message: 'Client reset initiated',
      });
    } catch (error) {
      this.logger.error(`Error resetting client ${userId}: ${error.message}`);
      client.emit('error', {
        userId,
        type: 'reset-failed',
        message: 'Failed to reset WhatsApp client',
      });
    }
  }

  // Event handlers to broadcast events to connected clients
  // @OnEvent('whatsapp.qr')
  // handleQrEvent(payload: { userId: string; qrCode: string }) {
  //   this.server.emit('qr-code', payload);
  // }

  @OnEvent('whatsapp.ready')
  handleReadyEvent(payload: { userId: string }) {
    this.server.emit('status', {
      userId: payload.userId,
      status: 'ready',
      message: 'WhatsApp is ready',
    });
  }

  @OnEvent('whatsapp.authenticated')
  handleAuthenticatedEvent(payload: { userId: string }) {
    this.server.emit('status', {
      userId: payload.userId,
      status: 'authenticated',
      message: 'WhatsApp is authenticated',
    });
  }

  @OnEvent('whatsapp.disconnected')
  handleDisconnectedEvent(payload: { userId: string; reason: string }) {
    this.server.emit('status', {
      userId: payload.userId,
      status: 'disconnected',
      message: `WhatsApp disconnected: ${payload.reason}`,
    });
  }

  @OnEvent('whatsapp.auth_failure')
  handleAuthFailureEvent(payload: { userId: string; error: string }) {
    this.server.emit('status', {
      userId: payload.userId,
      status: 'auth_failure',
      message: `Authentication failed: ${payload.error}`,
    });
  }

  @OnEvent('whatsapp.max_reconnect_reached')
  handleMaxReconnectEvent(payload: { userId: string }) {
    this.server.emit('status', {
      userId: payload.userId,
      status: 'max_reconnect_reached',
      message:
        'Maximum reconnection attempts reached. Please restart manually.',
    });
  }
}
