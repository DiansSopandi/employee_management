import { Role } from '@app/commons';
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
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getClass(),
      context.getHandler(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user && Array.isArray(user.role)) {
      user.role = user.role.map((role: Record<string, any>) =>
        role?.name.toLowerCase(),
      );
    }

    // const hasValidRole =
    //   user?.role &&
    //   Array.isArray(user.role) &&
    //   user.role.length > 0 &&
    //   requiredRoles.some((role) => user.role.includes(role.toLowerCase()));
    // if (!hasValidRole) {
    //   throw new ForbiddenException('Access denied. Insufficient permissions.');
    // }

    const userRoles = user.role
      .map((role: any) =>
        typeof role === 'string'
          ? role.toLowerCase()
          : role?.name?.toLowerCase(),
      )
      .filter(Boolean); // Remove undefined/null values

    const hasPermission = requiredRoles.some((role) =>
      userRoles.includes(role.toLowerCase()),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Access denied. Insufficient permissions.');
    }

    return true;
  }
}
