import { z } from 'zod';

// Trim + lowercase *before* the format check, so " A@X.com " becomes "a@x.com".
// Lowercasing also keeps the case-sensitive unique constraint meaningful.
const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

// Written by hand, not derived from the `users` table: the client sends a
// plain `password` (never `passwordHash`) and must not be able to set `role`.
export const registerSchema = z.object({
  email: emailSchema,
  // Not trimmed: spaces are valid password characters. The max stops
  // multi-megabyte inputs from tying up argon2.
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;

export type AccessTokenPayload = {
  sub: string;
  role: 'admin' | 'customer';
  tokenType: 'access';
  iat?: number;
  exp?: number;
};
