import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './auth.guard.js';
import type { AuthenticatedRequest } from './auth.types.js';
import { IS_PUBLIC_KEY } from './decorators/public.decorator.js';

const SECRET = 'test-secret-that-is-at-least-32-characters-long';

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: SECRET });
  const reflector = new Reflector();
  const guard = new JwtAuthGuard(jwt, reflector);

  function context(authorization?: string, isPublic = false) {
    const request = { headers: { authorization } } as AuthenticatedRequest;
    const handler = () => undefined;
    if (isPublic) Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
    const ctx = {
      getHandler: () => handler,
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { ctx, request };
  }

  const sign = (payload: object, secret = SECRET, expiresIn = 60) =>
    new JwtService({ secret }).signAsync(payload, { expiresIn });

  it('sets req.user from a valid access token', async () => {
    const token = await sign({ sub: '7', role: 'admin', tokenType: 'access' });
    const { ctx, request } = context(`Bearer ${token}`);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 7, role: 'admin' });
  });

  it('lets @Public() routes through without a token', async () => {
    const { ctx, request } = context(undefined, true);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });

  it.each([
    ['no header', undefined],
    ['wrong scheme', 'Basic abc'],
    ['empty bearer', 'Bearer '],
    ['garbage token', 'Bearer not.a.jwt'],
  ])('rejects %s', async (_case, header) => {
    await expect(guard.canActivate(context(header).ctx)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token signed with another secret', async () => {
    const token = await sign(
      { sub: '7', role: 'admin', tokenType: 'access' },
      'attacker-secret-that-is-also-long-enough-xx',
    );
    await expect(
      guard.canActivate(context(`Bearer ${token}`).ctx),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an expired token', async () => {
    const token = await sign(
      { sub: '7', role: 'customer', tokenType: 'access' },
      SECRET,
      -10,
    );
    await expect(
      guard.canActivate(context(`Bearer ${token}`).ctx),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a non-access token (e.g. a future refresh token)', async () => {
    const token = await sign({
      sub: '7',
      role: 'customer',
      tokenType: 'refresh',
    });
    await expect(
      guard.canActivate(context(`Bearer ${token}`).ctx),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an unsigned `alg: none` token', async () => {
    const b64 = (o: object) =>
      Buffer.from(JSON.stringify(o)).toString('base64url');
    const token = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
      sub: '1',
      role: 'admin',
      tokenType: 'access',
      exp: Math.floor(Date.now() / 1000) + 60,
    })}.`;
    await expect(
      guard.canActivate(context(`Bearer ${token}`).ctx),
    ).rejects.toThrow(UnauthorizedException);
  });
});
