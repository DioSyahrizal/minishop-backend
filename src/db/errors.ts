// Postgres error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
const UNIQUE_VIOLATION = '23505';

/**
 * True when `err` is a unique-constraint violation, optionally on a specific
 * constraint. Drizzle wraps driver errors, so the pg error is in `cause`.
 */
export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  const pgError = err instanceof Error && err.cause ? err.cause : err;
  if (typeof pgError !== 'object' || pgError === null) return false;

  const { code, constraint: name } = pgError as {
    code?: unknown;
    constraint?: unknown;
  };
  return (
    code === UNIQUE_VIOLATION &&
    (constraint === undefined || name === constraint)
  );
}
