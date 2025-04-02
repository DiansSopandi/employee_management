import { ROLES } from '@app/commons';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<ROLES[]>('roles', [
      context.getClass(),
      context.getHandler(),
    ]);

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (user && Array.isArray(user.role)) {
      user.role = user.role.map((role) => role.toLowerCase());
    }

    if (
      !user?.role ||
      !requiredRoles.some((role) => user.role.includes(role.toLowerCase()))
    )
      throw new ForbiddenException('Access denied. Insufficient permissions.');

    return true;
  }
}
