import { Injectable, Logger } from '@nestjs/common';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatHistories } from './entities/chat-histories.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server } from 'socket.io';
import { WhatsappInstanceEntity } from './entities/whatsapp-instance.entity';
import { UsersEntity } from '../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OtpCodesWhatsappEntity } from './entities/otp-codes-whatsapp.entity';
import { OtpHelper } from 'src/helper/otp.helper';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly clients = new Map<string, Client>();
  private readonly clientPromises = new Map<string, Promise<Client>>();
  private io: Server;
  private qrCode: string;
  private isAuthenticated = false;
  private userId: string;

  constructor(
    @InjectRepository(ChatHistories)
    private readonly chatHistoryRepository: Repository<ChatHistories>,
    @InjectRepository(OtpCodesWhatsappEntity)
    private readonly otpRepository: Repository<OtpCodesWhatsappEntity>,
    @InjectRepository(WhatsappInstanceEntity)
    private readonly whatsappInstanceRepository: Repository<WhatsappInstanceEntity>,
    @InjectRepository(UsersEntity)
    private readonly userRepository: Repository<UsersEntity>,
    private readonly jwtService: JwtService,
    private configService: ConfigService,
  ) {
    // this.client = new Client({
    //   authStrategy: new LocalAuth({ clientId: 'user1' }),
    //   // authStrategy: new LocalAuth(),
    //   // authStrategy: new LocalAuth({ clientId: this.userId }),
    //   puppeteer: {
    //     headless: true,
    //     args: ['--no-sandbox'],
    //   },
    // });
    // this.client.on('qr', async (qr) => {
    //   try {
    //     // this.qrCode = await qrcode.toDataURL(qr);
    //     this.qrCode = qr;
    //     // qrcode.generate(qr, { small: true });
    //     this.logger.log('QR Code Generated');
    //   } catch (error) {
    //     this.logger.log({ error });
    //   }
    // });
    // this.client.on('ready', () => {
    //   this.logger.log('WhatsApp Client is ready!');
    // });
    // this.client.on('authenticated', (session) => {
    //   this.isAuthenticated = true;
    //   this.logger.log('user authenticated via scan QrCode WhatsApp');
    //   // Simpan session, generate JWT, dll
    // });
    // this.client.on('message', async (msg) => {
    //   this.logger.log(`Received message from ${msg.from}: ${msg.body}`);
    //   // Simpan ke DB nanti di bagian lain
    // });
    // this.client.initialize();
  }

  setSocketServer(io: Server) {
    this.io = io;
  }

  getQrCode(): string {
    return this.qrCode;
  }

  async getChats(sessionId: string) {
    return await this.chatHistoryRepository.find({
      where: { session_id: sessionId },
      order: { created_at: 'DESC' },
    });
  }

  async createClient(userId: string, token = ''): Promise<Client> {
    if (token) {
      if (this.clients.has(userId)) {
        return this.clients.get(userId)!;
      }

      // Jika sedang dibuat, tunggu promise yang sama
      if (this.clientPromises.has(userId)) {
        return this.clientPromises.get(userId)!;
      }
    }

    // Buat client baru, dan simpan promise-nya supaya tidak double-create
    // const clientPromise = new Promise<Client>((resolve, reject) => {
    //   try {
    //     const client = new Client({
    //       authStrategy: new LocalAuth({ clientId: userId }),
    //       puppeteer: { headless: true },
    //     });

    //     this.clients[userId] = client;

    //     this.handleQr(client, userId);
    //     this.handleReady(client, userId);
    //     this.handleAuthenticated(client, userId);
    //     this.handleMessage(client);
    //     this.handleDisconnected(client, userId);

    //     client.initialize();
    //     this.clients.set(userId, client);
    //     resolve(client);
    //   } catch (error) {
    //     reject(error instanceof Error ? error : new Error(String(error)));
    //   } finally {
    //     this.clientPromises.delete(userId); // Hapus promise setelah selesai
    //   }
    // });
    return this.initializeClient(userId);
    // this.clientPromises.set(userId, clientPromise);
    // return clientPromise;
  }

  renameSession(oldId: string, userId: string) {
    const basePath = path.resolve('.wwebjs_auth');
    const oldPath = path.join(basePath, `session-${oldId}`);
    const newPath = path.join(basePath, `session-${userId}`);

    const oldExists = fs.existsSync(oldPath);
    const newExists = fs.existsSync(newPath);

    if (oldExists && !newExists) {
      fs.renameSync(oldPath, newPath);
      this.logger.log(
        `Session moved from ${oldId} to ${userId} successfully...`,
      );
    }

    if (newExists) {
      fs.rmSync(oldPath, { recursive: true, force: true });
      this.logger.log(`Session folder ${oldPath} deleted successfully...`);
    }
  }

  async initializeClient(userId: string): Promise<Client> {
    const clientPromise = new Promise<Client>((resolve, reject) => {
      try {
        const client = new Client({
          authStrategy: new LocalAuth({ clientId: userId }),
          puppeteer: {
            headless: true,
            args: [
              '--disable-dev-shm-usage',
              '--disable-setuid-sandbox',
              '--no-sandbox',
              '--disable-gpu',
              '--disable-extensions',
              '--disable-background-timer-throttling',
              '--disable-backgrounding-occluded-windows',
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
          },
          // Tambahkan timeout yang lebih lama
          qrMaxRetries: 5,
          authTimeoutMs: 60000,
        });

        this.clients[userId] = client;

        this.handleQr(client, userId);
        this.handleReady(client, userId);
        this.handleAuthenticated(client, userId);
        this.handleMessage(client);
        this.handleDisconnected(client, userId);

        client
          .initialize()
          .then(() => {
            this.logger.log(`Client ${userId} initialized successfully`);
            this.clients.set(userId, client);
            resolve(client);
          })
          .catch((error) => {
            console.error(`Failed to initialize client ${userId}:`, error);
            reject(error instanceof Error ? error : new Error(String(error)));
          })
          .finally(() => {
            this.clientPromises.delete(userId);
          });

        this.clients.set(userId, client);

        // this.clients[userId] = client;
        resolve(client);
      } catch (error) {
        this.logger.error(`Failed to initialize client ${userId}:`, error);
        reject(error instanceof Error ? error : new Error(String(error)));
      } finally {
        this.clientPromises.delete(userId); // Hapus promise setelah selesai
      }
    });

    this.clientPromises.set(userId, clientPromise);
    return clientPromise;
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // JWT Service
  async generateJwt(user): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_AT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_AT_EXP'),
    });
  }

  async sendMessage(userId: string, dto: SendMessageDto): Promise<string> {
    const client = this.clients[userId];
    if (!client) throw new Error('Client not found for user: ' + userId);

    const to = dto.to.includes('@c.us') ? dto.to : `${dto.to}@c.us`;
    await client.sendMessage(to, dto.message);
    this.logger.log('Message sent');
    return 'Message sent!';
  }

  private async handleQr(client: Client, userId: string) {
    const uuidExist = await this.whatsappInstanceRepository.findBy({
      uuid: userId,
    });

    if (!uuidExist.length) {
      await this.whatsappInstanceRepository.save({
        uuid: userId,
        status: 'INITIATED',
      });
    }
    client.on('qr', (qr) => {
      this.qrCode = qr;
      this.logger.log(`QR Code Generated for ${userId}`);

      if (this.io) {
        this.io.emit(`qr:${userId}`, qr);
      }

      // this.handleReady(client, userId);
      // this.handleAuthenticated(client, userId);
      // this.handleMessage(client);
    });
  }

  private handleReady(client: Client, userId: string) {
    client.on('ready', async () => {
      try {
        const waId = client.info.wid._serialized;

        await this.whatsappInstanceRepository.update(
          { uuid: userId },
          {
            status: 'CONNECTED',
            waId,
            clientInfo: JSON.parse(JSON.stringify(client.info)),
            lastConnected: new Date(),
          },
        );

        const user = await this.userRepository.findOne({ where: { waId } });

        if (user) {
          // await this.createClient(user.id.toString());
          this.io.emit(`login_success-${userId}`, {
            waId,
            user,
            token: this.generateJwt(user),
            redirect: '/dashboard',
          });
        } else {
          // Generate & simpan OTP untuk waId
          const otpRecord = await this.otpRepository
            .findOne({
              where: [{ waId, status: 'PENDING' }],
            })
            .then(async (otpCode) => {
              if (!otpCode) return null;

              if (otpCode?.expiresAt < new Date()) {
                await this.otpRepository.delete({ waId });
              }
              return null;
            });

          if (!otpRecord) {
            const otp = OtpHelper.generateOtp();
            this.logger.log(`OTP: ${otp}`);

            await this.otpRepository
              .save({
                otpCode: otp,
                waId,
                status: 'PENDING',
                expiresAt: OtpHelper.getExpiry(),
              })
              .catch((err) => {
                console.log({ err });
              });

            // Kirim OTP via WhatsApp
            await client.sendMessage(
              waId,
              `Your OTP Code Verification: ${otp}`,
            );

            this.io.emit(`unlinked_whatsapp-${userId}`, {
              waId,
              uuid: userId,
              message: 'Please verify your WhatsApp number to continue',
            });
          }
        }

        this.logger.log(`WhatsApp client for ${userId} is ready!`);
        if (this.io) {
          this.io.emit('ready', { userId });
        }
      } catch (error) {
        this.logger.error(`Error in ready handler for ${userId}:`, error);
      }
    });
  }

  private handleAuthenticated(client: Client, userId: string) {
    client.on('authenticated', () => {
      this.logger.log(`Client authenticated for ${userId}`);
    });
  }

  private handleMessage(client: Client) {
    client.on('message', async (message) => {
      const waId = message.from;
      const content = message.body.trim();

      this.handleIncomingMessage(waId, message);

      if (content.toLowerCase() === 'otp') {
        await this.sendOtpViaWhatsapp(waId, client);
      }
    });
  }

  private async sendOtpViaWhatsapp(waId: string, client: Client) {
    const otp = OtpHelper.generateOtp();

    await this.otpRepository.save({
      otpCode: otp,
      waId,
      status: 'PENDING',
      expiresAt: OtpHelper.getExpiry(),
    });

    await client.sendMessage(waId, `Your OTP Code Verification: ${otp}`);
  }

  async handleIncomingMessage(sessionId: string, msg: Message) {
    this.logger.log(
      `Incoming Message:  ${msg.body} from ${msg.from} for ${sessionId}`,
    );
    // Simpan ke database
    await this.chatHistoryRepository.save({
      session_id: sessionId,
      to_number: msg.from,
      message: msg.body,
      type: msg.type || 'text',
      status: 'received',
    });
  }

  private async handleDisconnected(client: Client, userId: string) {
    client.on('disconnected', async (reason) => {
      // Handle disconnection logic here
      console.log(`Client disconnected ${userId}: ${reason}`);

      await this.whatsappInstanceRepository.update(
        { uuid: userId },
        {
          status: 'DISCONNECTED',
        },
      );

      delete this.clients[userId];

      // Optional: Coba reconnect secara otomatis setelah delay
      if (reason !== 'LOGOUT' && reason !== 'CONFLICT') {
        this.logger.log(
          `Attempting to reconnect client ${userId} in 30 seconds...`,
        );
        setTimeout(async () => {
          try {
            await this.initializeClient(userId);
          } catch (error) {
            this.logger.error(`Failed to reconnect client ${userId}:`, error);
          }
        }, 30000);
      }
    });
  }

  async logout(userId: string) {
    const client = this.clients[userId];

    if (!client) {
      this.logger.error(`No active WhatsApp session for user ${userId}`);
      return false;
    }

    if (client) {
      try {
        await client.logout();
      } catch (error) {
        this.logger.error('Whatsapp Client logout failed', error);
        return false;
      }

      try {
        await client.destroy();
      } catch (error) {
        this.logger.error('Whatsapp Client destroy failed', error);
        return false;
      }

      this.logger.log('logout and destroy successfully...');
      const sessionPath = path.join('.wwebjs_auth', `session_${userId}`);
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        this.logger.log(
          `Session folder ${sessionPath} deleted successfully...`,
        );
      }
      return true;
    }
  }

  async destroyClient(userId: string) {
    const client = this.clients[userId];
    if (!client) {
      throw new Error(`No active WhatsApp session for user ${userId}`);
    }
    if (client) {
      await client.destroy();
      this.logger.log('destroy client successfully...');
      return true;
    }
  }

  async logOutAllSession() {
    try {
      const userIds = Object.keys(this.clients);

      console.log({ userIds });

      for (const userId of userIds) {
        const client = this.clients[userId];
        try {
          await client.logout();
          client.destroy();
          console.log(`✅ Logged out user ${userId}`);
        } catch (error) {
          console.error(`❌ Failed to logout user ${userId}`, error);
        }
        delete this.clients[userId];
      }
      return { success: true, message: 'logout all session successfully...' };
    } catch (error) {
      this.logger.error('Logout all session failed', error);
      return { success: false, message: 'Logout all session failed' };
    }
  }
}
