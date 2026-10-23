import type { AuthenticatedRequest } from './auth.types.js';

export function extractBearerToken(
  request: AuthenticatedRequest,
): string | undefined {
  const match = /^Bearer\s+(\S+)$/i.exec(
    request.headers.authorization?.trim() ?? '',
  );
  return match?.[1];
}
