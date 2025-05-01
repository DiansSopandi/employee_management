import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { CreateWhatsappDto } from './dto/create-whatsapp.dto';
import { UpdateWhatsappDto } from './dto/update-whatsapp.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { Public } from 'src/utils/decorators/public.decorator';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Public()
  @Post('start/:userId')
  async startClient(@Param('userId') userId: string) {
    await this.whatsappService.createClient(userId);
    return { message: `Client started for ${userId}` };
  }

  @Public()
  @Get('qr')
  getQrCode() {
    return {
      qr: this.whatsappService.getQrCode(),
    };
  }

  @Get('chats')
  async getChats(@Query('sessionId') sessionId: string) {
    return this.whatsappService.getChats(sessionId);
  }

  @Public()
  @Post('send')
  sendMessage(@Query('userId') userId: string, @Body() dto: SendMessageDto) {
    return this.whatsappService.sendMessage(userId, dto);
  }

  // @Post('send')
  // async sendMessage(@Body() body: { sessionId: string; to: string; message: string }) {
  //   return this.whatsappService.sendMessage(body.sessionId, body.to, body.message);
  // }

  @Public()
  @Post('logout/:userId')
  async logout(@Param('userId') userId: string) {
    return await this.whatsappService
      .logout(userId)
      .then((res) =>
        res ? { message: 'Logout successful' } : { message: 'Logout failed' },
      );
    // return { message: 'Logout successful' };
  }

  @Public()
  @Post('logout-all-session')
  async logOutAllSession() {
    return this.whatsappService.logOutAllSession();
  }
}
