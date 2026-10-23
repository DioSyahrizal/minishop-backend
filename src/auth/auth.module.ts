import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UsersModule } from '../users/users.module.js';
import { JwtModule } from '@nestjs/jwt';
import { env } from '../config/env.js';
import { JwtAuthGuard } from './auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { RefreshTokensService } from './refresh-tokens.service.js';

@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      secret: env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: env.JWT_ACCESS_TTL },
    }),
  ],
  controllers: [AuthController],
  // APP_GUARD is global even when declared here; living in AuthModule gives it
  // access to JwtService.
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    RefreshTokensService,
  ],
})
export class AuthModule {}
