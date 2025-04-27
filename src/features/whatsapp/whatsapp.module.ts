import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatHistories } from './entities/chat-histories.entity';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChatHistories]), SessionsModule],
  controllers: [WhatsappController],
  providers: [WhatsappService],
})
export class WhatsappModule {}
