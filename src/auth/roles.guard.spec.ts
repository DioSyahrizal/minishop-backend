import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser } from './auth.types.js';
import { Public } from './decorators/public.decorator.js';
import { Roles } from './decorators/roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

// Real decorators on a fake controller, so the test also covers how
// Reflector merges method- and class-level metadata.
class ProductsLikeController {
  open() {}

  @Roles('admin')
  adminOnly() {}

  @Roles('admin', 'customer')
  eitherRole() {}

  @Roles()
  emptyRoles() {}
}

@Roles('admin')
class AdminController {
  anything() {}
}

@Public()
class PublicController {
  @Roles('admin')
  adminOnly() {}
}

function context(
  controller: new () => object,
  method: string,
  user?: AuthUser,
): ExecutionContext {
  return {
    getHandler: () => (controller.prototype as Record<string, unknown>)[method],
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());
  const admin: AuthUser = { id: 1, role: 'admin' };
  const customer: AuthUser = { id: 2, role: 'customer' };

  it('allows any authenticated user when the route has no @Roles()', () => {
    expect(
      guard.canActivate(context(ProductsLikeController, 'open', customer)),
    ).toBe(true);
  });

  it('allows a user whose role is listed', () => {
    expect(
      guard.canActivate(context(ProductsLikeController, 'adminOnly', admin)),
    ).toBe(true);
  });

  it('forbids a user whose role is not listed', () => {
    expect(() =>
      guard.canActivate(context(ProductsLikeController, 'adminOnly', customer)),
    ).toThrow(ForbiddenException);
  });

  it('accepts any of several listed roles', () => {
    expect(
      guard.canActivate(
        context(ProductsLikeController, 'eitherRole', customer),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(context(ProductsLikeController, 'eitherRole', admin)),
    ).toBe(true);
  });

  it('applies class-level @Roles() to every method', () => {
    expect(guard.canActivate(context(AdminController, 'anything', admin))).toBe(
      true,
    );
    expect(() =>
      guard.canActivate(context(AdminController, 'anything', customer)),
    ).toThrow(ForbiddenException);
  });

  it('forbids (403, not 500) when a restricted route has no user', () => {
    expect(() =>
      guard.canActivate(
        context(ProductsLikeController, 'adminOnly', undefined),
      ),
    ).toThrow(ForbiddenException);
  });

  it('does not let a class-level @Public() bypass a method-level @Roles()', () => {
    expect(() =>
      guard.canActivate(context(PublicController, 'adminOnly', undefined)),
    ).toThrow(ForbiddenException);
    expect(
      guard.canActivate(context(PublicController, 'adminOnly', admin)),
    ).toBe(true);
  });

  it('denies everyone on an empty @Roles() (misconfiguration fails closed)', () => {
    expect(() =>
      guard.canActivate(context(ProductsLikeController, 'emptyRoles', admin)),
    ).toThrow(ForbiddenException);
  });
});
