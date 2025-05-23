import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest();

    const url = [
      '/v1/auth/login',
      '/v1/auth/whatsapp-login',
      '/v1/whatsapp/qr',
      '/v1/whatsapp/send',
      '/v1/auth/verify-otp',
    ];

    if (
      (isPublic && !request.cookies['jwt_at']) ||
      url.includes(request.originalUrl)
    )
      return true;

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) throw new UnauthorizedException();

    if (!user) {
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException(
          'Token has expired. Please log in again.',
        );
      }
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException(
          'Invalid token. Authentication failed.',
        );
      }
      if (info?.name === 'NotBeforeError') {
        throw new UnauthorizedException(
          'Token is not yet active. Try again later.',
        );
      }

      throw new UnauthorizedException(
        'Authentication failed. Token is missing or invalid.',
      );
    }

    return user;
  }
}
