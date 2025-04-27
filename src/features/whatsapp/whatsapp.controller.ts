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
  sendMessage(@Body() dto: SendMessageDto) {
    return this.whatsappService.sendMessage(dto);
  }

  // @Post('send')
  // async sendMessage(@Body() body: { sessionId: string; to: string; message: string }) {
  //   return this.whatsappService.sendMessage(body.sessionId, body.to, body.message);
  // }

  @Public()
  @Post('logout')
  async logout() {
    await this.whatsappService.logout();
    return { message: 'Logout successful' };
  }

  @Post()
  create(@Body() createWhatsappDto: CreateWhatsappDto) {
    return this.whatsappService.create(createWhatsappDto);
  }

  @Get()
  findAll() {
    return this.whatsappService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.whatsappService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateWhatsappDto: UpdateWhatsappDto,
  ) {
    return this.whatsappService.update(+id, updateWhatsappDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.whatsappService.remove(+id);
  }
}
