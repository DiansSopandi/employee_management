import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken'; // Assuming JWT-based authentication

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    let authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      const tokenFromCookie = request.cookies?.jwt_at;
      if (!tokenFromCookie) {
        throw new UnauthorizedException('Missing or invalid token');
      }
      authHeader = `Bearer ${tokenFromCookie}`;
    }

    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

      request.user = decoded;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
