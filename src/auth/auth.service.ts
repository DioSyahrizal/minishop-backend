import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { env } from '../config/env.js';
import { UsersService } from '../users/users.service.js';
import type { AuthUser } from './auth.types.js';
import type {
  AccessTokenPayload,
  LoginDto,
  RegisterDto,
} from './dto/auth.dto.js';
import { RefreshTokensService } from './refresh-tokens.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly refreshTokensService: RefreshTokensService,
  ) {}

  async register(dto: RegisterDto) {
    const hashedPassword = await argon2.hash(dto.password);
    return this.usersService.create({
      email: dto.email,
      passwordHash: hashedPassword,
    });
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    const valid =
      user && (await argon2.verify(user.passwordHash, dto.password));

    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // No familyId: a login starts a new session (family).
    const refreshToken = await this.refreshTokensService.issue(user.id);
    return this.tokenResponse(user, refreshToken);
  }

  async refresh(rawToken: string) {
    const { userId, refreshToken } =
      await this.refreshTokensService.rotate(rawToken);

    // Reload the user so the new access token carries the *current* role.
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    return this.tokenResponse(user, refreshToken);
  }

  /** Ends the session the token belongs to. Idempotent: unknown tokens are fine. */
  async logout(rawToken: string): Promise<void> {
    const familyId = await this.refreshTokensService.findFamily(rawToken);
    if (familyId) await this.refreshTokensService.revokeFamily(familyId);
  }

  // Login and refresh return the same shape, so clients handle them alike.
  private async tokenResponse(user: AuthUser, refreshToken: string) {
    const payload: AccessTokenPayload = {
      sub: String(user.id),
      role: user.role,
      tokenType: 'access',
    };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      refreshToken,
      tokenType: 'Bearer' as const,
      expiresIn: env.JWT_ACCESS_TTL,
      // Seconds. Lets a client size its session (e.g. a "remember me"
      // cookie) without duplicating JWT_REFRESH_TTL. Each rotation resets it.
      refreshExpiresIn: env.JWT_REFRESH_TTL,
    };
  }
}
