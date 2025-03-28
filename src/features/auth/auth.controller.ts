import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Session,
  HttpStatus,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthenticateDto } from './dto/create-auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from 'src/utils/decorators/public.decorator';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private logger: Logger,
  ) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Req() req,
    @Body() createAuthenticateDto: CreateAuthenticateDto,
    @Session() session: any,
  ) {
    const { sub, email, roles } = req.user,
      token = await this.authService.getTokens(sub, email, roles),
      atToken = token['at_cookie'],
      rtToken = token['rt_cookie'];

    session['userId'] = req.user['id'].toString();
    session['email'] = req.user['email'];

    req.res.setHeader('Set-Cookie', [atToken, rtToken]);

    createAuthenticateDto['id'] = req.user.id;
    return {
      id: createAuthenticateDto['id'],
      email: createAuthenticateDto['email'],
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req, @Session() session: any) {
    try {
      req.res.setHeader('Set-Cookie', this.authService.getCookiesForLogOut());

      session['userId'] = null;
      session['email'] = null;
      session['passport'] = null;

      return req.user
        ? { id: req.user.id, email: req.user.email }
        : { id: null, email: null };
    } catch (error) {
      return { id: null, email: null, error };
    }
  }

  @Get('profile')
  getProfile(@Req() req) {
    return req.user;
  }

  @Get('who-am-i')
  async whoAmI(@Req() req, @Session() session: Record<string, any>) {
    return { user: req.user };
  }
}
