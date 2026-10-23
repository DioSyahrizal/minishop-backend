import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import type { AuthUser } from './auth.types.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  type LoginDto,
  type RefreshTokenDto,
  type RegisterDto,
} from './dto/auth.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) registerDto: RegisterDto,
  ) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body(new ZodValidationPipe(loginSchema)) loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // Public: the refresh token in the body is the credential, since the
  // access token has usually expired by the time a client refreshes.
  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenDto,
  ) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(
    @Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenDto,
  ): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  // Reads from the DB rather than echoing the token, so a deleted user or a
  // changed role is reflected immediately.
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const found = await this.usersService.findById(user.id);
    if (!found) throw new UnauthorizedException('User no longer exists');
    return found;
  }
}
