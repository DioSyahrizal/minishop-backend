import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';

import type {
  AccessTokenPayload,
  LoginDto,
  RegisterDto,
} from './dto/auth.dto.js';
import { UsersService } from '../users/users.service.js';
import { JwtService } from '@nestjs/jwt';
import { env } from '../config/env.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
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
    const payload: AccessTokenPayload = {
      sub: String(user.id),
      role: user.role,
      tokenType: 'access',
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: env.JWT_ACCESS_TTL,
    };
  }
}
