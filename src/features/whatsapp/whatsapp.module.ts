import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatHistories } from './entities/chat-histories.entity';
import { SessionsModule } from '../sessions/sessions.module';
import { WhatsappGateway } from './whatsapp.gateway';
import { OtpCodesWhatsappEntity } from './entities/otp-codes-whatsapp.entity';
import { WhatsappInstanceEntity } from './entities/whatsapp-instance.entity';
import { UsersEntity } from '../users/entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { QrThrottleService } from './qr-throttle.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatHistories,
      OtpCodesWhatsappEntity,
      WhatsappInstanceEntity,
      UsersEntity,
    ]),
    JwtModule,
    SessionsModule,
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappGateway, QrThrottleService],
})
export class WhatsappModule {}
