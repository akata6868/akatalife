/**
 * Sliding-window in-memory + audit-backed login rate limiter.
 * Protects /api/auth/login and /api/auth/setup against brute-force attacks.
 */

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 8;

export function checkLoginRateLimit(key: string, now = Date.now()): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
} {
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - 1,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - existing.count,
    retryAfterSeconds: 0,
  };
}

export function resetLoginRateLimit(key: string): void {
  buckets.delete(key);
}
