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
import { AuditTrailService } from 'src/audit-trail/audit-trail.service';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersEntity } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { max } from 'class-validator';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UsersEntity)
    private readonly usersRepository: Repository<UsersEntity>,
    private logger: Logger,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly auditService: AuditTrailService,
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

    // Log authentication event
    await this.auditService.logChange('User', 'LOGIN', +id);
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

  async whatsAppLogin(waId: string) {
    const user = await this.usersRepository.findOne({
      where: { waId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { id, email, roles } = user;
    const jwtPayload = {
      sub: id,
      email: email,
      role: roles,
    };

    const atToken = await this.jwtService.signAsync(jwtPayload, {
      secret: this.configService.get<string>('JWT_AT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_AT_EXP'),
    });
    const rtToken = await this.jwtService.signAsync(jwtPayload, {
      secret: this.configService.get<string>('JWT_RT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_RT_EXP'),
    });

    return {
      user,
      atToken,
      rtToken,
      max_age: this.configService.get<string>('JWT_AT_COOKIE_EXP'),
      at_cookie: `jwt_at=${atToken}; HttpOnly; Path=/; Max-Age=${this.configService.get<string>('JWT_AT_COOKIE_EXP')}`,
      rt_cookie: `jwt_rt=${rtToken}; HttpOnly; Path=/; Max-Age=${this.configService.get<string>('JWT_RT_COOKIE_EXP')}`,
    };
  }

  async changeUserRole(userId: number, newRole: string) {
    // Perform role change logic

    // Log role change event
    await this.auditService.logChange('User', 'UPDATE_ROLE', userId, {
      role: newRole,
    });
  }

  getCookiesForLogOut() {
    return [
      'jwt_at=; HttpOnly; Path=/; Max-Age=0',
      'jwt_rt=; HttpOnly; Path=/; Max-Age=0',
    ];
  }
}
