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
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ac } from '@faker-js/faker/dist/airline-CBNP41sR';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private logger: Logger,
  ) {
    this.logger = new Logger(AuthController.name);
  }

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
      const { user, atToken, at_cookie, rt_cookie } =
        await this.authService.whatsAppLogin(body);

      req.res.setHeader('Set-Cookie', [at_cookie, rt_cookie]);
      req.res.setHeader('Authorization', `Bearer ${atToken}`);

      return { success: true, user, redirect: '/dashboard' };
    } catch (error) {
      this.logger.error('Error in whatsappLogin:', error);
      throw error;
    }
  }

  @Public()
  @Post('verify-otp')
  async verifyOtp(@Req() req, @Body() body: VerifyOtpDto) {
    try {
      const { userId, otp, email, phoneNumber } = body;
      const result = await this.authService.verifyOtp({
        userId,
        otp,
        email,
        phoneNumber,
      });

      const { access_token, at_cookie, rt_cookie } = result.token;
      req.res.setHeader('Set-Cookie', [at_cookie, rt_cookie]);
      req.res.setHeader('Authorization', `Bearer ${access_token}`);

      return {
        success: true,
        message: 'OTP verified successfully',
        redirect: '/dashboard',
        userId: result.user.id,
      };
    } catch (error) {
      this.logger.error('Error in verifyOtp:', error);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req,
    @Session() session: any,
    @Res({ passthrough: true }) res,
  ) {
    try {
      try {
        await this.authService.whatsappLogout(req.user.id.toString());
      } catch (error) {
        this.logger.error('Error in whatsappLogout:', error);
      }
      // req.res.setHeader('Set-Cookie', this.authService.getCookiesForLogOut());
      const clearCookies = await this.authService.getCookiesForLogOut();
      clearCookies.forEach((cookie) => res.header('Set-Cookie', cookie));

      req.session.destroy(() => {});
      res.clearCookie('employeeSession');
      res.clearCookie('jwt_at');
      res.clearCookie('jwt_rt');

      session['userId'] = null;
      session['email'] = null;
      session['passport'] = null;

      this.logger.log(`Username ${req.user.email} logged out successfully`);
      return req.user
        ? { success: true, id: req.user.id, email: req.user.email }
        : { success: false, id: null, email: null };
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
