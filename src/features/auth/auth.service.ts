import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CreateAuthenticateDto } from './dto/create-auth.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private logger: Logger,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.logger = new Logger(AuthService.name);
  }

  async validateUser(loginDto: CreateAuthenticateDto) {
    const user = await this.usersService.findByEmail(loginDto);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const response = {
      success: true,
      message: 'Authorized',
      data: { email: user.email, isActive: user.isActive },
    };

    this.logger.log(response);

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.roles,
    };

    return user;
    // return {
    //   access_token: this.jwtService.sign(payload),
    // };
  }

  async findUserById(id: number) {
    return this.usersService.findById(id);
  }

  async getTokens(id: string, email: string, role?: string[]) {
    const jwtPayload = {
      sub: id,
      email: email,
      role: role,
    };

    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.get<string>('JWT_AT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_AT_EXP'),
      }),
      this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.get<string>('JWT_RT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_RT_EXP'),
      }),
    ]);

    const atCookie = `jwt_at=${at}; HttpOnly; Path=/; Max-Age=${this.configService.get<string>(
      'JWT_AT_COOKIE_EXP',
    )}`;
    const rtCookie = `jwt_rt=${rt}; HttpOnly; Path=/; Max-Age=${this.configService.get<string>(
      'JWT_RT_COOKIE_EXP',
    )}`;

    return {
      access_token: at,
      at_cookie: atCookie,
      refresh_token: rt,
      rt_cookie: rtCookie,
    };
  }

  // async removeRefreshToken(userId: string) {
  //   try {
  //     const dto = new UpdateUserDto();
  //     dto.hashedRt = null;

  //     const updateResult = await this.userService.updateById(userId, dto);
  //     response = CrudMessage.updateResolved('', '', updateResult.data);

  //     delete response.data;

  //     return response;
  //   } catch (error) {
  //     return CrudMessage.updateError(this.entityName, userId, error);
  //   }
  // }

  getCookiesForLogOut() {
    return [
      'jwt_at=; HttpOnly; Path=/; Max-Age=0',
      'jwt_rt=; HttpOnly; Path=/; Max-Age=0',
    ];
  }
}
