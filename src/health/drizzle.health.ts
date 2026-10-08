import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import { type Database, DB } from '../db/db.module.js';

@Injectable()
export class DrizzleHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,

    @Inject(DB)
    private readonly db: Database,
  ) {}

  isHealthy(key: string) {
    return this.healthIndicatorService
      .check(key)
      .attempt(async () => {
        try {
          await this.db.execute(sql`SELECT 1`);
        } catch (err) {
          throw new Error(describeDbError(err), { cause: err });
        }
      })
      .withTimeout(1000);
  }
}

// Drizzle wraps driver errors as "Failed query: ...", so the useful part
// (ECONNREFUSED, bad password, ...) lives in `cause`.
function describeDbError(err: unknown): string {
  let e = err instanceof Error && err.cause !== undefined ? err.cause : err;

  // Connecting to `localhost` tries both ::1 and 127.0.0.1; when both fail,
  // Node throws an AggregateError with an empty message.
  if (e instanceof AggregateError && e.errors.length > 0) {
    e = e.errors[0];
  }

  if (!(e instanceof Error)) return String(e);

  const code = (e as { code?: unknown }).code;
  return typeof code === 'string' ? `${code}: ${e.message}` : e.message;
}
