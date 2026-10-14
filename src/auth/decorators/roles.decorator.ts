import { SetMetadata } from '@nestjs/common';
import type { AuthUser } from '../auth.types.js';

export const ROLES_KEY = 'roles';

/** Restricts a route (or controller) to the given roles. */
export const Roles = (...roles: AuthUser['role'][]) =>
  SetMetadata(ROLES_KEY, roles);
