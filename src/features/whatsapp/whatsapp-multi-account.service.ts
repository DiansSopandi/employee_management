import { Injectable, Logger } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import { ClientManager } from './client.manager';
import { Server } from 'socket.io';

@Injectable()
export class WhatsappMultiAccountService {
  private io: Server;
  private readonly logger = new Logger(WhatsappMultiAccountService.name);

  constructor(private readonly clientManager: ClientManager) {}

  setSocketServer(io: Server) {
    this.io = io;
  }

  async createClient(userId: string) {
    if (this.clientManager.getClient(userId)) {
      this.logger.log(`Client ${userId} already exists`);
      return;
    }

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: userId }),
    });

    client.on('qr', (qr) => {
      this.logger.log(`QR Code Generated for ${userId}`);
      this.io.emit(`qr:${userId}`, qr);
    });

    client.on('authenticated', () => {
      this.logger.log(`Authenticated ${userId}`);
      this.io.emit(`authenticated:${userId}`);
    });

    client.on('ready', () => {
      this.logger.log(`Client ready for ${userId}`);
      this.io.emit(`ready:${userId}`);
    });

    client.on('disconnected', (reason) => {
      this.logger.log(`Client disconnected ${userId}: ${reason}`);
      this.clientManager.deleteClient(userId);
      this.io.emit(`disconnected:${userId}`, reason);
    });

    await client.initialize();
    this.clientManager.setClient(userId, client);
  }
}
