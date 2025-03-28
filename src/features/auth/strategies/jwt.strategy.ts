import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/features/users/users.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    protected configService: ConfigService,
    private usersService: UsersService,
  ) {
    const jwtSecret = configService.get('JWT_SECRET');
    // jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          if (request?.cookies?.jwt_at) {
            return request.cookies.jwt_at;
          }
          if (request?.headers?.authorization) {
            return request.headers.authorization.replace('Bearer ', '');
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any, request: Request) {
    return await this.usersService.findById(payload.sub);
  }
}
