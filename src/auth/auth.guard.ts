import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedRequest } from './auth.types.js';
import { IS_PUBLIC_KEY } from './decorators/public.decorator.js';
import type { AccessTokenPayload } from './dto/auth.dto.js';
import { extractBearerToken } from './utils.auth.js';

/**
 * Registered globally (APP_GUARD): every route requires a valid access token
 * unless it is marked @Public().
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    let payload: AccessTokenPayload;
    try {
      // Pin the algorithm so a token can't pick its own (e.g. `alg: none`).
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        algorithms: ['HS256'],
      });
    } catch {
      // Expired, bad signature, malformed: the client doesn't need the reason.
      throw new UnauthorizedException('Invalid or expired access token');
    }

    // Keeps a refresh token (later) from being used as an access token.
    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    request.user = { id: Number(payload.sub), role: payload.role };
    return true;
  }
}
