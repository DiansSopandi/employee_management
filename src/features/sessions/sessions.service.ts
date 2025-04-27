import { Injectable, Logger } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { WhatsAppSessionEntity } from './entities/session.entity';
import { Repository } from 'typeorm';
import { UsersEntity } from '../users/entities/user.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private readonly sessions: Map<string, Client> = new Map();
  // private clients: Map<string, Client> = new Map();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(WhatsAppSessionEntity)
    private readonly whatsAppSessionRepository: Repository<WhatsAppSessionEntity>,
    @InjectRepository(UsersEntity)
    private readonly usersRepository: Repository<UsersEntity>,
  ) {}

  // async createSession(sessionId: string): Promise<Client> {
  async createSession(): Promise<Client> {
    const sessionUUID = randomUUID();

    // if (this.sessions.has(sessionId)) {
    //   const session = this.sessions.get(sessionId);
    //   if (!session) {
    //     throw new Error(`Session with ID ${sessionId} does not exist.`);
    //   }
    //   return session;
    // }

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: sessionUUID }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    client.on('ready', () => {
      console.log(`Client ${sessionUUID} is ready!`);
      this.eventEmitter.emit('clientReady', sessionUUID, client);
    });

    client.initialize();
    this.sessions.set(sessionUUID, client);

    await this.whatsAppSessionRepository.save({
      sessionId: sessionUUID,
      status: 'PENDING',
    });

    return client;
  }

  getSession(sessionId: string): Client | undefined {
    return this.sessions.get(sessionId);
  }

  async getSessionStatus(sessionId: string) {
    const session = await this.whatsAppSessionRepository.findOne({
      where: { sessionId },
    });
    if (!session) {
      throw new Error('Session not found');
    }
    return { status: session.status };
  }

  deleteSession(sessionId: string): void {
    const client = this.sessions.get(sessionId);
    // const client = this.clients.get(sessionId);
    if (client) {
      client.destroy();
      this.sessions.delete(sessionId);
      // this.clients.delete(sessionId);
    }
  }

  async handleIncomingMessage(sessionId: string, message: any) {
    const phoneNumber = message.from.replace('@c.us', '');
    let user = await this.usersRepository.findOne({ where: { phoneNumber } });

    user ??= await this.usersRepository.save({ phoneNumber });

    const session = await this.whatsAppSessionRepository.findOne({
      where: { sessionId },
    });

    if (session && !session.userId) {
      session.userId = user.id;
      session.status = 'READY';
      await this.whatsAppSessionRepository.save(session);
    }
  }
}
