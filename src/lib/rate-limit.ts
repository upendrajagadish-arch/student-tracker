/**
 * In-memory rate limiter — suitable for single-instance deployments only.
 * Implement `RateLimitStore` with Redis for horizontal scaling and call `setRateLimitStore`.
 */

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds?: number;
}

export interface RateLimitStore {
  consume(key: string, config: RateLimitConfig): Promise<RateLimitResult>;
}

class MemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, { count: number; resetAt: number }>();

  async consume(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    let entry = this.buckets.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 1, resetAt: now + config.windowMs };
      this.buckets.set(key, entry);
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: entry.resetAt,
      };
    }

    entry.count += 1;
    const allowed = entry.count <= config.maxRequests;

    return {
      allowed,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetAt: entry.resetAt,
      retryAfterSeconds: allowed
        ? undefined
        : Math.ceil((entry.resetAt - now) / 1000),
    };
  }
}

let store: RateLimitStore = new MemoryRateLimitStore();

export function setRateLimitStore(next: RateLimitStore): void {
  store = next;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  return store.consume(key, config);
}

export const RATE_LIMITS = {
  login: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
  import: { windowMs: 60 * 60 * 1000, maxRequests: 20 },
  resumeUpload: { windowMs: 60 * 60 * 1000, maxRequests: 30 },
  analyticsExport: { windowMs: 60 * 60 * 1000, maxRequests: 15 },
  matching: { windowMs: 60 * 60 * 1000, maxRequests: 20 },
  readinessBulk: { windowMs: 60 * 60 * 1000, maxRequests: 10 },
  jdParse: { windowMs: 60 * 60 * 1000, maxRequests: 30 },
  resumeInsight: { windowMs: 60 * 60 * 1000, maxRequests: 40 },
} as const satisfies Record<string, RateLimitConfig>;

export function rateLimitKey(
  prefix: string,
  request: Request,
  userId?: string
): string {
  const ip = getClientIp(request);
  return userId ? `${prefix}:user:${userId}` : `${prefix}:ip:${ip}`;
}

export async function enforceRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  return checkRateLimit(key, config);
}
