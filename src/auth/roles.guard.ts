import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest, AuthUser } from './auth.types.js';
import { ROLES_KEY } from './decorators/roles.decorator.js';

/**
 * Runs after JwtAuthGuard (registration order in AuthModule). Routes without
 * @Roles() are open to any authenticated user.
 *
 * Deliberately ignores @Public(): if a route asks for a role, the role is
 * required, even under a class-level @Public(). The stricter rule wins.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AuthUser['role'][]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // An empty @Roles() also lands here: deny, the safe side of a typo.
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
