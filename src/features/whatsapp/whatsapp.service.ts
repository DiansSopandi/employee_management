import { Injectable, Logger } from '@nestjs/common';
import { CreateWhatsappDto } from './dto/create-whatsapp.dto';
import { UpdateWhatsappDto } from './dto/update-whatsapp.dto';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode';
// import * as qrcode from 'qrcode-terminal';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatHistories } from './entities/chat-histories.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionsService } from '../sessions/sessions.service'; // Ini service handling wa client

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly client: Client;
  private readonly clients: Record<string, Client>;
  private qrCode: string;
  private isAuthenticated = false;
  private userId: string;

  constructor(
    @InjectRepository(ChatHistories)
    private readonly chatHistoryRepository: Repository<ChatHistories>,
    private readonly sessionsService: SessionsService,
  ) {
    this.client = new Client({
      authStrategy: new LocalAuth({ clientId: 'user1' }),
      // authStrategy: new LocalAuth(),
      // authStrategy: new LocalAuth({ clientId: this.userId }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox'],
      },
    });

    this.client.on('qr', async (qr) => {
      try {
        // this.qrCode = await qrcode.toDataURL(qr);
        this.qrCode = qr;
        // qrcode.generate(qr, { small: true });
        this.logger.log('QR Code Generated');
      } catch (error) {
        this.logger.log({ error });
      }
    });

    this.client.on('ready', () => {
      this.logger.log('WhatsApp Client is ready!');
    });

    this.client.on('authenticated', (session) => {
      this.isAuthenticated = true;
      this.logger.log(' user authenticated via scan QrCode WhatsApp');
      // Simpan session, generate JWT, dll
    });

    this.client.on('message', async (msg) => {
      this.logger.log(`Received message from ${msg.from}: ${msg.body}`);
      // Simpan ke DB nanti di bagian lain
    });

    this.client.initialize();
  }

  getQrCode(): string {
    return this.qrCode;
  }

  async getChats(sessionId: string) {
    return this.chatHistoryRepository.find({
      where: { session_id: sessionId },
      order: { created_at: 'DESC' },
    });
  }

  createClient(userId: string) {
    const sessionPath = `./sessions/${userId}.json`;
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: userId }),
      puppeteer: { headless: true },
    });

    this.clients[userId] = client;

    client.on('qr', (qr) => {
      // Generate & send QR to frontend
    });

    client.on('ready', () => {
      console.log(`WhatsApp ${userId} ready!`);
    });

    client.initialize();
  }

  async sendMessage(dto: SendMessageDto): Promise<string> {
    const to = dto.to.includes('@c.us') ? dto.to : `${dto.to}@c.us`;
    await this.client.sendMessage(to, dto.message);
    this.logger.log('Message sent');
    return 'Message sent!';
  }

  async handleIncomingMessage(sessionId: string, msg: Message) {
    console.log('Incoming Message:', msg.body);

    // Simpan ke database
    await this.chatHistoryRepository.save({
      session_id: sessionId,
      to_number: msg.from,
      message: msg.body,
      type: msg.type || 'text',
      status: 'received',
    });

    // Cek untuk Auto-Reply
    const lowerBody = msg.body.toLowerCase();

    if (lowerBody.includes('halo')) {
      const client = this.sessionsService.getSession(sessionId);
      if (client) {
        await client.sendMessage(
          msg.from,
          'Halo juga! Ada yang bisa kami bantu?',
        );
      }
    }

    if (lowerBody.includes('harga')) {
      const client = this.sessionsService.getSession(sessionId);
      if (client) {
        await client.sendMessage(
          msg.from,
          'Harga produk kami mulai dari Rp 10.000.',
        );
      }
    }
  }

  async logout() {
    if (this.client) {
      await this.client.logout();
      this.logger.log('logout successfully...');
    }
  }

  create(createWhatsappDto: CreateWhatsappDto) {
    return 'This action adds a new whatsapp';
  }

  findAll() {
    return `This action returns all whatsapp`;
  }

  findOne(id: number) {
    return `This action returns a #${id} whatsapp`;
  }

  update(id: number, updateWhatsappDto: UpdateWhatsappDto) {
    return `This action updates a #${id} whatsapp`;
  }

  remove(id: number) {
    return `This action removes a #${id} whatsapp`;
  }
}
