import type { Request } from 'express';
import type { User } from '../db/schema.js';

/** What the guard puts on `req.user`: the clean form of the token claims. */
export type AuthUser = {
  id: number;
  role: User['role'];
};

export type AuthenticatedRequest = Request & { user?: AuthUser };
