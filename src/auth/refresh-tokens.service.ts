import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { type Database, DB } from '../db/db.module.js';
import { refreshTokens } from '../db/schema.js';

// A transaction handle has the same query API as the db itself.
type Executor =
  Database | Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Opaque refresh tokens, stored only as SHA-256 hashes.
 *
 * Family = one login session. Every rotation keeps the family, and exactly one
 * token per family is active. A revoked token coming back means two parties
 * hold copies of the session, so the whole family is revoked.
 */
@Injectable()
export class RefreshTokensService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Starts a new family (login) or continues one (rotation). */
  async issue(
    userId: number,
    familyId: string = randomUUID(),
    executor: Executor = this.db,
  ): Promise<string> {
    // 256 random bits: unguessable, so a fast hash is enough (no argon2).
    const token = randomBytes(32).toString('base64url');
    await executor.insert(refreshTokens).values({
      userId,
      familyId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL * 1000),
    });
    // The only time the raw token exists: handed to the client, never stored.
    return token;
  }

  /** Exchanges a valid token for a new one in the same family. */
  async rotate(
    rawToken: string,
  ): Promise<{ userId: number; refreshToken: string }> {
    const tokenHash = hashToken(rawToken);

    const result = await this.db.transaction(async (tx) => {
      // Revoke-and-check in ONE statement. Two concurrent requests with the
      // same token can't both succeed: Postgres row locking lets only the first
      // UPDATE match `revoked_at IS NULL`; the second sees it already revoked.
      const [current] = await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(refreshTokens.tokenHash, tokenHash),
            isNull(refreshTokens.revokedAt),
            gt(refreshTokens.expiresAt, new Date()),
          ),
        )
        .returning({
          userId: refreshTokens.userId,
          familyId: refreshTokens.familyId,
        });

      if (!current) return null;

      const refreshToken = await this.issue(
        current.userId,
        current.familyId,
        tx,
      );
      return { userId: current.userId, refreshToken };
    });

    if (result) return result;

    // Nothing was rotated. Find out why, outside the (finished) transaction.
    const [existing] = await this.db
      .select({
        familyId: refreshTokens.familyId,
        revokedAt: refreshTokens.revokedAt,
      })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash));

    if (existing?.revokedAt) {
      // Reuse of a revoked token: assume theft, kill the whole session.
      await this.revokeFamily(existing.familyId);
    }
    // Unknown, expired, or reused: the client gets the same answer.
    throw new UnauthorizedException('Invalid or expired refresh token');
  }

  /** Ends a session: used for logout and reuse detection. */
  async revokeFamily(familyId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.familyId, familyId),
          isNull(refreshTokens.revokedAt),
        ),
      );
  }

  /** Looks up which family a token belongs to (for logout). */
  async findFamily(rawToken: string): Promise<string | undefined> {
    const [row] = await this.db
      .select({ familyId: refreshTokens.familyId })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashToken(rawToken)));
    return row?.familyId;
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
