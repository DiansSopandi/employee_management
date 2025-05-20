import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Client, ClientOptions, LocalAuth, Message } from 'whatsapp-web.js';
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
import * as fsLiteral from 'fs';
import { rimraf } from 'rimraf';
// import { unlink, mkdir } from 'fs/promises';
import * as fs from 'fs/promises';
import { promisify } from 'util';
import { exec } from 'child_process';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { error } from 'console';
import { QrThrottleService } from './qr-throttle.service';

const execPromise = promisify(exec);

interface ClientWithListeners extends Client {
  hasInitializedListeners?: boolean;
}
@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);
  public readonly clients = new Map<string, Client>();
  private readonly clientPromises = new Map<string, Promise<Client>>();
  private io: Server;
  private qrCode: string;
  private isAuthenticated = false;
  private userId: string;

  private readonly clientStatus: Map<
    string,
    'initializing' | 'ready' | 'authenticated' | 'disconnected' | 'error'
  > = new Map();
  private readonly reconnectAttempts: Map<string, number> = new Map();
  private readonly cooldownTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly processingQueue: Map<string, Promise<any>> = new Map();

  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 30000; // 30 seconds
  private readonly SESSION_BASE_PATH = path.join(process.cwd(), '.wwebjs_auth');
  private readonly QR_COOLDOWN = 30000; // 5 seconds

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
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly qrThrottleService: QrThrottleService,
  ) {
    process.setMaxListeners(20);

    setInterval(
      () => {
        this.healthCheck();
      },
      5 * 60 * 1000,
    );
  }

  async onModuleInit() {
    // Metode hook lifecycle NestJS - dipanggil saat modul diinisialisasi
    this.logger.log('WhatsappService initialized');
    await this.ensureSessionDirectory();
    // await this.cleanupPendingSessions();
  }
  async onModuleDestroy() {
    // Metode hook lifecycle NestJS - dipanggil saat aplikasi ditutup
    // Pastikan semua client WhatsApp ditutup dengan bersih
    this.logger.log('WhatsappService destroying, logging out all sessions...');
    // await this.logOutAllSession();
  }

  setSocketServer(io: Server) {
    this.io = io;
  }

  private async ensureSessionDirectory() {
    try {
      await fs.mkdir(this.SESSION_BASE_PATH, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create session directory: ${error.message}`);
    }
  }

  // private async cleanupPendingSessions(): Promise<void> {
  //   const pendingCleanupPath = path.join(
  //     process.cwd(),
  //     '.pending_cleanup.json',
  //   );

  //   if (fs.existsSync(pendingCleanupPath)) {
  //     try {
  //       const pendingCleanups = JSON.parse(
  //         fs.readFileSync(pendingCleanupPath, 'utf8'),
  //       );

  //       for (const dirPath of pendingCleanups) {
  //         try {
  //           if (fs.existsSync(dirPath)) {
  //             await rimraf(dirPath, { maxRetries: 3, retryDelay: 1000 });
  //             this.logger.log(
  //               `Cleanup pending folder successfully: ${dirPath}`,
  //             );
  //           }
  //         } catch (error) {
  //           this.logger.warn(
  //             `cleanup pending folder failed ${dirPath}: ${error.message}`,
  //           );
  //         }
  //       }

  //       // Reset file pending cleanups
  //       fs.writeFileSync(pendingCleanupPath, JSON.stringify([], null, 2));
  //     } catch (error) {
  //       this.logger.error(`Error cleanup pending session: ${error.message}`);
  //     }
  //   }
  // }

  private async healthCheck() {
    for (const [userId, status] of this.clientStatus.entries()) {
      if (status === 'error' || status === 'disconnected') {
        const attempts = this.reconnectAttempts.get(userId) || 0;
        if (attempts < this.MAX_RECONNECT_ATTEMPTS) {
          this.logger.log(
            `Health check: Attempting to recover client ${userId}`,
          );
          try {
            await this.resetAndRestartClient(userId);
          } catch (error) {
            this.logger.error(
              `Health check: Failed to recover client ${userId}: ${error.message}`,
            );
            if (this.io) this.io.emit('connect_error', error.message);
          }
        }
      }
    }
  }

  async resetAndRestartClient(userId: string): Promise<void> {
    return this.queueOperation(userId, async () => {
      try {
        // Destroy existing client
        await this.destroyClient(userId);

        // Clean up session files
        await this.cleanupSessionFiles(userId);

        // Restart the client
        await this.startClient(userId);
      } catch (error) {
        this.logger.error(
          `Failed to reset and restart client ${userId}: ${error.message}`,
        );
        throw error;
      }
    });
  }

  private async handleReconnect(userId: string) {
    const attempts = (this.reconnectAttempts.get(userId) || 0) + 1;
    this.reconnectAttempts.set(userId, attempts);

    if (attempts <= this.MAX_RECONNECT_ATTEMPTS) {
      this.logger.log(
        `Attempting to reconnect client ${userId} in ${this.RECONNECT_DELAY / 1000} seconds... (Attempt ${attempts}/${this.MAX_RECONNECT_ATTEMPTS})`,
      );

      setTimeout(async () => {
        try {
          await this.resetAndRestartClient(userId);
        } catch (error) {
          this.logger.error(
            `Failed to reconnect client ${userId}: ${error.message}`,
          );
          if (this.io) this.io.emit('connect_error', error.message);
        }
      }, this.RECONNECT_DELAY);
    } else {
      this.logger.warn(
        `Max reconnect attempts reached for ${userId}. Manual intervention required.`,
      );
      // this.eventEmitter.emit('whatsapp.max_reconnect_reached', { userId });
      if (this.io) this.io.emit(`max_reconnect_reached:${userId}`);
    }
  }

  // Queue mechanism to ensure sequential processing of requests per client
  private async queueOperation<T>(
    userId: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    // Wait for any existing operation to complete
    const existingOperation = this.processingQueue.get(userId);
    if (existingOperation) {
      try {
        await existingOperation;
      } catch (error) {
        console.error(`Queue Operation issue ${error}`);
      }
    }

    // Create and store the new operation
    const newOperation = operation().finally(() => {
      // Clean up queue if this was the last operation
      if (this.processingQueue.get(userId) === newOperation) {
        this.processingQueue.delete(userId);
      }
    });

    this.processingQueue.set(userId, newOperation);
    return newOperation;
  }

  async startClient(
    userId: string,
  ): Promise<{ success: boolean; qrCode?: string; message?: string }> {
    return this.queueOperation(userId, async () => {
      try {
        // Check if client already exists
        if (this.clients.has(userId)) {
          const status = this.clientStatus.get(userId);

          if (status === 'authenticated') {
            return { success: true, message: 'Client already authenticated' };
          }

          // If client exists but in bad state, destroy it first
          if (status === 'error' || status === 'disconnected') {
            await this.destroyClient(userId);
          }
        }

        // Clean up any existing session files that might cause issues
        await this.cleanupSessionFiles(userId);

        // Create new client
        const client = this.createClient(userId);
        this.clients.set(userId, client);
        this.clientStatus.set(userId, 'initializing');
        this.reconnectAttempts.set(userId, 0);

        // Set up event handlers
        this.setupClientEventHandlers(client, userId);

        // Initialize client and wait for QR code
        const qrCodePromise = new Promise<string>((resolve, reject) => {
          // Set a timeout in case QR event never fires
          const timeout = setTimeout(() => {
            reject(new Error('QR code generation timeout'));
          }, 30000);

          client.once('qr', (qrCode) => {
            clearTimeout(timeout);
            resolve(qrCode);
          });

          client.once('ready', () => {
            clearTimeout(timeout);
            this.clientStatus.set(userId, 'authenticated');
            reject(new Error('Client authenticated directly'));
          });

          client.once('auth_failure', (error) => {
            clearTimeout(timeout);
            reject(new Error(`Authentication failure: ${error}`));
          });
        });

        // Initialize the client
        await client.initialize();
        this.logger.log(`Client ${userId} initialized successfully`);

        // Get QR code
        try {
          const qrCode = await qrCodePromise;
          this.logger.log(`QR Code Generated for ${userId}`);
          this.eventEmitter.emit('whatsapp.qr', { userId, qrCode });
          return { success: true, qrCode };
        } catch (error) {
          if (error.message === 'Client authenticated directly') {
            return { success: true, message: 'Client authenticated directly' };
          }
          throw error;
        }
      } catch (error) {
        this.logger.error(
          `Error starting client for ${userId}: ${error.message}`,
        );

        this.clientStatus.set(userId, 'error');
        return { success: false, message: error.message };
      }
    });
  }

  public createClient(userId: string): Client {
    const sessionPath = path.join(this.SESSION_BASE_PATH, `session-${userId}`);

    const clientOptions: ClientOptions = {
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
        ],
      },
      session: undefined, // We'll handle session management ourselves
      authTimeoutMs: 60000,
      qrMaxRetries: 5,
      restartOnAuthFail: false, // We'll handle restarts manually
    };

    return new Client(clientOptions);
  }

  private setupClientEventHandlers(client: Client, userId: string) {
    client.on('qr', (qrCode) => {
      // Add cooldown protection
      if (this.cooldownTimers.has(userId)) {
        return;
      }

      this.logger.log(`QR Code Generated for ${userId}`);
      // this.eventEmitter.emit('whatsapp.qr', { userId, qrCode });
      if (this.io) this.io.emit(`qr:${userId}`, qrCode);

      // Set cooldown
      const timer = setTimeout(() => {
        this.cooldownTimers.delete(userId);
      }, this.QR_COOLDOWN);
      this.cooldownTimers.set(userId, timer);
    });

    client.on('ready', async () => {
      this.logger.log(`Client ${userId} is ready`);
      this.clientStatus.set(userId, 'ready');
      this.reconnectAttempts.set(userId, 0);

      const waId = client.info.wid._serialized;

      await this.checkWhatsAppUser(client, { userId, waId });

      // this.eventEmitter.emit('whatsapp.ready', { userId });
      if (this?.io) this.io.emit(`ready:${userId}`, { userId });
    });

    client.on('authenticated', () => {
      this.logger.log(`Client ${userId} authenticated successfully`);
      this.clientStatus.set(userId, 'authenticated');
      this.reconnectAttempts.set(userId, 0);
      // this.eventEmitter.emit('whatsapp.authenticated', { userId });
      if (this.io) this.io.emit(`authenticated:${userId}`);
    });

    client.on('message', async (message) => {
      const waId = message.from;
      const content = message.body.trim();

      this.handleIncomingMessage(waId, message);

      if (content.toLowerCase() === 'otp') {
        await this.sendOtpViaWhatsapp(waId, client);
      }
    });

    client.on('auth_failure', (error) => {
      this.logger.warn(`Authentication failed for ${userId}: ${error}`);
      this.clientStatus.set(userId, 'error');
      // this.eventEmitter.emit('whatsapp.auth_failure', { userId, error });
      if (this.io) this.io.emit(`auth_failure:${userId}`);

      // Try to restart client after auth failure
      this.handleReconnect(userId);
    });

    client.on('disconnected', (reason) => {
      this.logger.warn(`Client ${userId} disconnected: ${reason}`);
      this.clientStatus.set(userId, 'disconnected');
      // this.eventEmitter.emit('whatsapp.disconnected', { userId, reason });

      if (this.io) this.io.emit(`disconnect:${userId}`, { reason });

      // Handle reconnection
      this.handleReconnect(userId);
    });

    // Add more event handlers as needed for your application
  }

  private async checkWhatsAppUser(
    client: Client,
    data: { userId: string; waId: string },
  ) {
    const { userId, waId } = data;
    const user = await this.userRepository.findOne({ where: { waId } });

    if (user) {
      const token = await this.generateJwt(user);
      this.io.emit(`login_success-${userId}`, {
        waId,
        user,
        token,
        redirect: '/dashboard',
      });
    } else {
      await this.handleUnlinkedWhatsApp(client, { waId, userId });
    }
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

  // async createClient(userId: string, token = ''): Promise<ClientWithListeners> {
  //   if (token && this.clients.has(userId)) {
  //     const existingClient = this.clients.get(userId);
  //     if (existingClient) {
  //       return existingClient;
  //     }
  //   }
  //   // Jika sedang dibuat, tunggu promise yang sama
  //   if (this.clientPromises.has(userId)) {
  //     return this.clientPromises.get(userId)!;
  //   }

  //   return this.initializeClient(userId);
  // }

  // private async safeUnlink(filePath: string) {
  //   try {
  //     await unlink(filePath);
  //   } catch (error: any) {
  //     if (error.code === 'EBUSY' || error.code === 'EPERM') {
  //       this.logger.warn(
  //         `Gagal hapus file karena sedang digunakan: ${filePath}`,
  //       );
  //     } else {
  //       throw error;
  //     }
  //   }
  // }

  renameSession(oldId: string, userId: string) {
    const basePath = path.resolve('.wwebjs_auth');
    const oldPath = path.join(basePath, `session-${oldId}`);
    const newPath = path.join(basePath, `session-${userId}`);

    const oldExists = fsLiteral.existsSync(oldPath);
    const newExists = fsLiteral.existsSync(newPath);

    if (oldExists && !newExists) {
      try {
        fsLiteral.renameSync(oldPath, newPath);
      } catch (error) {
        if (error.code === 'EPERM') {
          this.logger.warn(
            `Failed to delete session: ${error.path}. May be in use.`,
          );
        } else {
          throw error;
        }
      }
      this.logger.log(
        `Session moved from ${oldId} to ${userId} successfully...`,
      );
    }

    if (newExists) {
      try {
        fsLiteral.rmSync(oldPath, { recursive: true, force: true });
      } catch (error) {
        if (error.code === 'EPERM') {
          this.logger.warn(
            `Failed to delete session: ${error.path}. May be in use.`,
          );
        } else {
          throw error;
        }
      }
      this.logger.log(`Session folder ${oldPath} deleted successfully...`);
    }
  }

  // async initializeClient(userId: string): Promise<ClientWithListeners> {
  //   const clientPromise = new Promise<Client>((resolve, reject) => {
  //     (async () => {
  //       try {
  //         await this.cleanExistingSessionFolder(userId);

  //         const client = new Client({
  //           authStrategy: new LocalAuth({ clientId: userId }),
  //           puppeteer: {
  //             headless: true,
  //             args: [
  //               '--disable-dev-shm-usage',
  //               '--disable-setuid-sandbox',
  //               '--no-sandbox',
  //               '--disable-gpu',
  //               '--disable-extensions',
  //               '--disable-background-timer-throttling',
  //               '--disable-backgrounding-occluded-windows',
  //             ],
  //             executablePath:
  //               process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  //             timeout: 120000,
  //           },
  //           // Tambahkan timeout yang lebih lama
  //           qrMaxRetries: 5,
  //           authTimeoutMs: 60000,
  //           // takeoverTimeoutMs: 60000,
  //           // takeoverOnConflict: true,
  //           // puppeteerOptions: {
  //           //   retry: 3,
  //           //   retryDelay: 5000,
  //           // },
  //         }) as ClientWithListeners;

  //         this.setupEventListeners(client, userId);
  //         this.clients.set(userId, client);

  //         try {
  //           await client.initialize();
  //           this.logger.log(`Client ${userId} initialized successfully`);
  //           resolve(client);
  //         } catch (error) {
  //           this.logger.error(`Failed to initialize client ${userId}:`, error);
  //           this.clients.delete(userId);

  //           // Tambahkan penanganan khusus untuk error QR Max Retries
  //           if (error.message?.includes('Max qrcode retries reached')) {
  //             // Lakukan pembersihan khusus
  //             await this.handleQrMaxRetriesError(userId);
  //           }

  //           reject(error instanceof Error ? error : new Error(String(error)));
  //         }

  //         // Tambahkan error handler untuk client
  //         client.on('disconnected', async (reason) => {
  //           this.logger.warn(`Client ${userId} disconnected: ${reason}`);
  //           // await client.destroy();
  //           // Hapus client dari map
  //           this.clients.delete(userId);
  //           // Bersihkan resource
  //           await this.cleanupSessionFiles(userId);
  //         });
  //       } catch (error) {
  //         this.logger.error(`Failed to initialize client ${userId}:`, error);
  //         reject(error instanceof Error ? error : new Error(String(error)));
  //       } finally {
  //         this.clientPromises.delete(userId); // Hapus promise setelah selesai
  //       }
  //     })();
  //   });

  //   this.clientPromises.set(userId, clientPromise);
  //   return clientPromise;
  // }

  // private async cleanExistingSessionFolder(userId: string): Promise<void> {
  //   const sessionDir = path.join(
  //     process.cwd(),
  //     '.wwebjs_auth',
  //     `session-${userId}`,
  //   );

  //   try {
  //     // Cek file tertentu yang sering menyebabkan masalah
  //     const problematicFiles = [
  //       path.join(sessionDir, 'Default', 'chrome_debug.log'),
  //       path.join(sessionDir, 'Default', 'Lock'),
  //       path.join(sessionDir, 'Default', 'SingletonLock'),
  //     ];

  //     for (const filePath of problematicFiles) {
  //       if (fs.existsSync(filePath)) {
  //         try {
  //           fs.unlinkSync(filePath);
  //           this.logger.log(`Delete file problem successfully...: ${filePath}`);
  //         } catch (err) {
  //           this.logger.warn(
  //             `Unable delete problem files: ${filePath} - ${err.message}`,
  //           );
  //         }
  //       }
  //     }
  //   } catch (error) {
  //     this.logger.warn(`Error cleanup current session: ${error.message}`);
  //   }
  // }

  // private async handleQrMaxRetriesError(userId: string): Promise<void> {
  //   this.logger.log(`Handle QR Max Retries for user ${userId}`);

  //   // Hapus koneksi dari clients map jika masih ada
  //   this.clients.delete(userId);

  //   // Tambahkan delay sebelum cleanup
  //   await new Promise((resolve) => setTimeout(resolve, 10000));

  //   try {
  //     // Gunakan process.exec untuk menutup paksa proses Chrome yang mungkin masih berjalan
  //     if (process.platform === 'win32') {
  //       // Untuk Windows
  //       const { exec } = require('child_process');
  //       exec('taskkill /F /IM chrome.exe', (err) => {
  //         if (err)
  //           this.logger.warn(`Failed close process Chrome: ${err.message}`);
  //         else this.logger.log('Process close chrome successfully');
  //       });
  //     } else if (
  //       process.platform === 'linux' ||
  //       process.platform === 'darwin'
  //     ) {
  //       // Untuk Linux/Mac
  //       const { exec } = require('child_process');
  //       exec('pkill -f chrome', (err) => {
  //         if (err)
  //           this.logger.warn(`Failed close process Chrome: ${err.message}`);
  //         else this.logger.log('Process close chrome successfully');
  //       });
  //     }

  //     // Coba bersihkan folder sesi
  //     await this.cleanupSessionFiles(userId);
  //   } catch (error) {
  //     this.logger.error(`Failed handle QR Max Retries: ${error.message}`);
  //   }
  // }

  // async cleanupSessionFiles(userId: string): Promise<void> {
  //   const sessionDir = path.join(
  //     process.cwd(),
  //     '.wwebjs_auth',
  //     `session-${userId}`,
  //   );

  //   try {
  //     // Tambahkan delay sebelum mencoba menghapus file
  //     // untuk memastikan semua handler file sudah dilepaskan
  //     await new Promise((resolve) => setTimeout(resolve, 5000));

  //     if (fs.existsSync(sessionDir)) {
  //       // Gunakan rimraf untuk menghapus folder secara rekursif
  //       // dengan force option untuk mengatasi permission issues

  //       try {
  //         await rimraf(sessionDir, {
  //           maxRetries: 3,
  //           retryDelay: 1000,
  //           backoff: 2,
  //           glob: {
  //             ignore: ['**/chrome_debug.log'],
  //           },
  //         });
  //         this.logger.log(`Session files for ${userId} cleaned successfully`);
  //       } catch (error) {
  //         this.logger.warn(
  //           `failed to delete several session files for ${userId}: ${error.message}`,
  //         );
  //       }
  //     }
  //   } catch (error) {
  //     this.logger.error(
  //       `Failed to cleanup session files for ${userId}: ${error.message}`,
  //       error,
  //     );
  //     throw error;
  //   }
  // }

  async cleanupSessionFiles(userId: string): Promise<void> {
    const sessionPath = path.join(this.SESSION_BASE_PATH, `session-${userId}`);

    try {
      // Check if directory exists
      await fs.access(sessionPath).catch(() => {
        /* Directory doesn't exist, nothing to clean */
      });

      // On Windows, try to force close Chrome processes first
      // if (process.platform === 'win32') {
      //   try {
      //     // Try to kill any Chrome processes that might be locking files
      //     await execPromise('taskkill /F /IM chrome.exe /T').catch(() => {
      //       /* Ignore if no process found */
      //     });
      //     // Give some time for OS to release file handles
      //     await new Promise((resolve) => setTimeout(resolve, 1000));
      //   } catch (error) {
      //     this.logger.warn(`Unable to kill Chrome processes: ${error.message}`);
      //   }
      // }

      // Try to delete specific problematic files first
      const problematicFiles = [
        path.join(sessionPath, 'Default', 'chrome_debug.log'),
        path.join(sessionPath, 'Default', 'Cookies'),
        path.join(sessionPath, 'Default', 'Network', 'Cookies'),
      ];

      for (const file of problematicFiles) {
        try {
          await fs.unlink(file).catch(() => {
            /* Ignore if file doesn't exist */
          });
        } catch (error) {
          this.logger.warn(
            `Unable delete problem files: ${file} - ${error.message}`,
          );
        }
      }

      // Try to remove the entire directory with retries
      let retries = 3;
      while (retries > 0) {
        try {
          await fs.rm(sessionPath, { recursive: true, force: true });
          this.logger.log(`Session files for ${userId} cleaned successfully`);
          this.qrThrottleService.resetCooldown(userId);
          return;
        } catch (error) {
          retries--;
          if (retries === 0) {
            this.logger.warn(
              `failed to delete several session files for ${userId}: ${error.message}`,
            );
            return;
          }
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      this.logger.warn(
        `Error cleaning session files for ${userId}: ${error.message}`,
      );
    }
  }

  // Method to get client state - useful for frontend queries
  getClientState(userId: string): { exists: boolean; status?: string } {
    const exists = this.clients.has(userId);
    if (!exists) {
      return { exists: false };
    }

    return {
      exists: true,
      status: this.clientStatus.get(userId),
    };
  }

  // private async cleanupExistingClient(userId: string): Promise<void> {
  //   if (this.clients.has(userId)) {
  //     try {
  //       const existingClient = this.clients.get(userId);
  //       if (existingClient) {
  //         this.logger.log(`Cleaning up existing client for ${userId}`);
  //         existingClient.removeAllListeners();
  //         await existingClient
  //           .destroy()
  //           .catch((err) =>
  //             this.logger.warn(
  //               `Error destroying existing client: ${err.message}`,
  //             ),
  //           );
  //       }
  //     } catch (error) {
  //       this.logger.warn(
  //         `Error during client cleanup for ${userId}: ${error.message}`,
  //       );
  //     } finally {
  //       this.clients.delete(userId);
  //     }
  //   }
  // }

  // private setupEventListeners(
  //   client: ClientWithListeners,
  //   userId: string,
  // ): void {
  //   // Hindari penambahan listener berulang
  //   if (client.hasInitializedListeners) {
  //     return;
  //   }

  //   // Atur event handlers
  //   this.setupQrHandler(client, userId);
  //   this.setupReadyHandler(client, userId);
  //   this.setupAuthenticatedHandler(client, userId);
  //   this.setupMessageHandler(client);
  //   this.setupDisconnectedHandler(client, userId);

  //   // Tandai bahwa listeners sudah diinisialisasi
  //   client.hasInitializedListeners = true;
  // }

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
    await this.chatHistoryRepository.save({
      session_id: userId,
      to_number: to,
      message: dto.message,
      type: 'text',
      status: 'sent',
    });
    this.logger.log('Message sent');
    return 'Message sent!';
  }

  private async setupQrHandler(
    client: ClientWithListeners,
    userId: string,
  ): Promise<void> {
    client.on('qr', async (qr) => {
      this.qrCode = qr;

      await this.insertWhatsappNumber(userId);

      if (this.io) {
        this.io.emit(`qr:${userId}`, qr);
      }
      this.logger.log(`QR Code Generated for ${userId}`);
    });
  }

  private async insertWhatsappNumber(userId: string) {
    const uuidExist = await this.whatsappInstanceRepository.findBy({
      uuid: userId,
    });

    if (!uuidExist.length) {
      await this.whatsappInstanceRepository.save({
        uuid: userId,
        status: 'INITIATED',
      });
    }
  }

  private setupReadyHandler(client: Client, userId: string) {
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
          const token = await this.generateJwt(user);
          this.io.emit(`login_success-${userId}`, {
            waId,
            user,
            token,
            redirect: '/dashboard',
          });
        } else {
          await this.handleUnlinkedWhatsApp(client, { waId, userId });
        }

        this.logger.log(`WhatsApp client for ${userId} is ready!`);
        if (this?.io) {
          this.io.emit('ready', { userId });
        }
      } catch (error) {
        this.logger.error(`Error in ready handler for ${userId}:`, error);
      }
    });
  }

  private async handleUnlinkedWhatsApp(
    client: Client,
    data: { waId: string; userId: string },
  ): Promise<void> {
    // Cek OTP yang masih aktif
    const { waId, userId } = data;
    const otpRecord = await this.otpRepository
      .findOne({
        where: [{ waId, status: 'PENDING' }],
      })
      .then(async (otpCode) => {
        if (!otpCode) return null;

        if (otpCode?.expiresAt < new Date()) {
          await this.otpRepository.delete({ waId });
          return null;
        }
        return otpCode;
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
          this.logger.error('Error saving OTP:', err);
        });

      // Kirim OTP via WhatsApp
      await client.sendMessage(waId, `Your OTP Code Verification: ${otp}`);

      this.io?.emit(`unlinked_whatsapp-${userId}`, {
        waId,
        uuid: userId,
        message: 'Please verify your WhatsApp number to continue',
      });
      this.logger.log('OTP sent to unlinked WhatsApp number');
    }
  }

  private setupAuthenticatedHandler(
    client: ClientWithListeners,
    userId: string,
  ): void {
    client.on('authenticated', () => {
      this.logger.log(`Client authenticated for ${userId}`);
    });
  }

  private setupMessageHandler(client: Client) {
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

  private async setupDisconnectedHandler(
    client: Client,
    userId: string,
  ): Promise<void> {
    client.on('disconnected', async (reason) => {
      try {
        // Handle disconnection logic here

        await this.whatsappInstanceRepository.update(
          { uuid: userId },
          {
            status: 'DISCONNECTED',
          },
        );
        this.logger.log(`Client disconnected ${userId}: ${reason}`);

        await this.cleanupClient(client, userId);

        // Optional: Coba reconnect secara otomatis setelah delay
        if (reason !== 'LOGOUT' && reason !== 'CONFLICT') {
          this.handleReconnect(userId);
        }
      } catch (error) {
        this.logger.error(
          `Error in disconnected handler for ${userId}:`,
          error,
        );
        throw new Error(error);
      }
    });
  }

  private async cleanupClient(
    client: ClientWithListeners,
    userId: string,
  ): Promise<void> {
    try {
      // Berikan sedikit waktu sebelum logout
      await new Promise((resolve) => setTimeout(resolve, 1000));

      client.removeAllListeners();
      await client
        .logout()
        .catch((err) =>
          this.logger.warn(`Error during logout: ${err.message}`),
        );
      await client
        .destroy()
        .catch((err) =>
          this.logger.warn(`Error destroying client: ${err.message}`),
        );
    } catch (error) {
      this.logger.error(`Error cleaning up client ${userId}:`, error);
    } finally {
      this.clients.delete(userId);
    }
  }

  // private handleReconnect(userId: string): void {
  //   if (!userId) return;
  //   this.logger.log(
  //     `Attempting to reconnect client ${userId} in 30 seconds...`,
  //   );

  //   setTimeout(async () => {
  //     try {
  //       if (!this.clients.has(userId) && !this.clientPromises.has(userId)) {
  //         console.log('reconnect on progress...');
  //         await this.initializeClient(userId);
  //       }
  //     } catch (error) {
  //       this.logger.error(`Failed to reconnect client ${userId}:`, error);
  //     }
  //   }, 30000);
  // }

  async logout(userId: string): Promise<boolean> {
    const client = this.clients[userId];

    if (!client) {
      this.logger.error(`No active WhatsApp session for user ${userId}`);
      return false;
    }

    try {
      // Hapus semua event listeners untuk mencegah memory leak
      client.removeAllListeners();
      // Logout dan destroy client
      await client.logout();
      await client.destroy();

      // Hapus sesi dari map
      this.clients.delete(userId);

      // Hapus folder sesi jika ada
      this.cleanupSessionFolder(userId);

      this.logger.log(`User ${userId} logged out successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Error logging out user ${userId}: ${error.message}`);
      return false;
    }
  }

  private cleanupSessionFolder(userId: string): void {
    try {
      const sessionPath = path.join('.wwebjs_auth', `session-${userId}`);
      if (fsLiteral.existsSync(sessionPath)) {
        try {
          fsLiteral.rmSync(sessionPath, { recursive: true, force: true });
        } catch (error) {
          if (error.code === 'EPERM') {
            this.logger.warn(
              `Failed to delete session: ${error.path}. May be in use.`,
            );
          } else {
            throw error;
          }
        }
        this.logger.log(`Session folder ${sessionPath} deleted successfully`);
      }
    } catch (error) {
      this.logger.error(`Error cleaning up session folder: ${error.message}`);
    }
  }

  async destroyClient(userId: string): Promise<boolean> {
    // const client = this.clients[userId];
    // Jika map maka gunakan get karena map bukan syntak array
    const client = this.clients.get(userId);
    if (!client) {
      this.logger.warn(`No client found for user ${userId}, skipping destroy`);
      return false;
    }

    try {
      client.removeAllListeners();
      // await client.destroy();
      // Logout client jika dalam keadaan authenticated
      try {
        if (client.info?.wid) {
          await client
            .logout()
            .catch((err) =>
              this.logger.warn(
                `Error logout moment for ${userId}: ${err.message}`,
              ),
            );
        }
      } catch (error) {
        this.logger.warn(`Failed Logout for  ${userId}: ${error.message}`);
      }

      await client
        .destroy()
        .catch((err) =>
          this.logger.warn(
            `Failed destroy moment for ${userId}: ${err.message}`,
          ),
        );
      this.clients.delete(userId);
      try {
        await this.cleanupSessionFiles(userId);
      } catch (error) {
        this.logger.warn(
          `Failed cleanup session file ${userId}: ${error.message}`,
        );
      }

      // 🔥 Reset cooldown agar user bisa scan QR lagi
      this.qrThrottleService.resetCooldown(userId);

      this.logger.log(`Client ${userId} destroyed successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Error destroying client ${userId}: ${error.message}`);
      throw error;
    }
  }

  // public async destroyClient(userId: string): Promise<void> {
  //   const client = this.clients.get(userId);
  //   if (!client) return;

  //   try {
  //     // Try to logout gracefully
  //     await client.logout().catch((error) => {
  //       this.logger.warn(`Error during logout: ${error.message}`);
  //     });
  //   } catch (error) {
  //     this.logger.warn(`Error during logout: ${error.message}`);
  //   } finally {
  //     // Close the client regardless of logout success
  //     try {
  //       await client.destroy();
  //     } catch (error) {
  //       this.logger.warn(`Error during client destruction: ${error.message}`);
  //     }

  //     // Clear resources
  //     this.clients.delete(userId);

  //     // Clear any cooldown timers
  //     if (this.cooldownTimers.has(userId)) {
  //       clearTimeout(this.cooldownTimers.get(userId));
  //       this.cooldownTimers.delete(userId);
  //     }
  //   }
  // }

  async logOutAllSession(): Promise<{ success: boolean; message: string }> {
    try {
      const userIds = Array.from(this.clients.keys());
      this.logger.log(`Logging out all sessions: ${userIds.length} clients`);

      const logoutPromises = userIds.map(async (userId) => {
        try {
          const client = this.clients.get(userId);
          if (client) {
            client.removeAllListeners();
            await client
              .logout()
              .catch((err) =>
                this.logger.warn(
                  `Error during logout for ${userId}: ${err.message}`,
                ),
              );
            await client
              .destroy()
              .catch((err) =>
                this.logger.warn(
                  `Error destroying client for ${userId}: ${err.message}`,
                ),
              );
            this.clients.delete(userId);
            this.logger.log(`✅ Logged out user ${userId}`);
          }
        } catch (error) {
          this.logger.error(`❌ Failed to logout user ${userId}`, error);
        }
      });

      await Promise.allSettled(logoutPromises);

      // Bersihkan map setelah semua logout
      this.clients.clear();
      this.clientPromises.clear();

      return { success: true, message: 'Logout all sessions successfully' };
    } catch (error) {
      this.logger.error('Logout all session failed', error);
      return {
        success: false,
        message: `Logout all session failed: ${error.message}`,
      };
    }
  }

  async logOutAllSessionx() {
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
