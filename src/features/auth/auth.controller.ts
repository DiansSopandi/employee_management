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
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthenticateDto } from './dto/create-auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from 'src/utils/decorators/public.decorator';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthWhatsappDto } from './dto/create-auth-whatsapp.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
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
    const { id, email, roles } = req.user,
      token = await this.authService.getTokens(id, email, roles),
      atToken = token['at_cookie'],
      rtToken = token['rt_cookie'],
      bearerToken = token['access_token'];

    session['userId'] = req.user['id'].toString();
    session['email'] = req.user['email'];

    req.res.setHeader('Set-Cookie', [atToken, rtToken]);
    req.res.setHeader('Authorization', `Bearer ${bearerToken}`);

    createAuthenticateDto['id'] = req.user.id;
    return {
      id: createAuthenticateDto['id'],
      email: createAuthenticateDto['email'],
      accessToken: bearerToken,
    };
  }

  @Public()
  @Post('whatsapp-login')
  async whatsappLogin(
    @Req() req,
    @Body() body: CreateAuthWhatsappDto,
    @Res({ passthrough: true }) res,
  ) {
    try {
      const { user, atToken, rtToken, max_age, at_cookie, rt_cookie } =
        await this.authService.whatsAppLogin(body.waId);

      req.res.setHeader('Set-Cookie', [at_cookie, rt_cookie]);
      req.res.setHeader('Authorization', `Bearer ${atToken}`);

      // res.cookie('jwt_at', token, {
      //   httpOnly: true,
      //   secure: process.env.NODE_ENV === 'production',
      //   sameSite: 'lax',
      //   maxAge: max_age,
      //   // maxAge: 1000 * 60 * 60 * 24 * 7, // 7 hari
      // });

      return { user, redirect: '/dashboard' };
    } catch (error) {
      this.logger.error('Error in whatsappLogin:', error);
      throw error; // Rethrow the error to be handled by NestJS exception filter
    }
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
