import { Controller, Get, Param, Post } from '@nestjs/common';
import { SessionsService } from './sessions.service';

@Controller('session')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('login')
  async login() {
    return await this.sessionsService.createSession();
  }

  @Get('status')
  async getStatus(@Param('id') id: string) {
    return await this.sessionsService.getSessionStatus(id);
  }
}
