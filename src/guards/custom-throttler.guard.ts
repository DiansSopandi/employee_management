import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { decode } from 'punycode';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions()
    protected readonly options: ThrottlerModuleOptions,
    @InjectThrottlerStorage()
    protected readonly storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {
    super(options, storageService, reflector);
  }

  // contoh override
  // protected async handleRequest(
  //   context: any,
  //   limit: number,
  //   ttl: number,
  //   throttlerStorage: ThrottlerStorage,
  // ) {
  //   const request = context.switchToHttp().getRequest();
  //   const token = request.headers['authorization']?.split(' ')[1];

  //   if (token) {
  //     try {
  //       const payload = this.jwtService.verify(token);
  //       const key = `rate-limit:user:${payload.sub}`;
  //       const ttls = await throttlerStorage.increment(key, ttl);

  //       if (ttls.totalHits > limit) {
  //         throw this.throwThrottlingException(context);
  //       }
  //       return true;
  //     } catch {
  //       // kalau token invalid → fallback ke IP
  //     }
  //   }
  // }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Prioritas: User ID > IP Address
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      try {
        const decoded = this.jwtService.decode(token) as any;
        if (decoded?.sub) {
          return `user:${decoded.sub}`;
        }
      } catch (error) {
        console.log('Token decode error:', error.message);
        // Fallback ke IP jika token invalid
      }
    }

    return req.ip || req.connection.remoteAddress;
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Skip untuk admin users
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (token) {
      try {
        const decoded = this.jwtService.decode(token) as any;

        // if (
        //   decoded?.role === 'ADMIN' ||
        //   decoded?.permissions?.includes('bypass_rate_limit')
        // ) {
        //   return true;
        // }

        if (decoded?.role?.some((r: any) => r.name === 'ADMIN')) {
          return true;
        }
        if (decoded?.permissions?.includes('bypass_rate_limit')) {
          return true;
        }
      } catch (error) {
        console.log('Admin check error:', error.message);
        // Continue with rate limiting
      }
    }

    return super.shouldSkip(context);
  }

  protected async getErrorMessage(): Promise<string> {
    return 'Rate limit exceeded. Please try again later.1';
  }
}
