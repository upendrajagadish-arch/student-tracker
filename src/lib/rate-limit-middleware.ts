import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import {
  checkRateLimit,
  rateLimitKey,
  RATE_LIMITS,
  type RateLimitConfig,
} from "@/lib/rate-limit";

export async function withRateLimit(
  request: Request,
  prefix: string,
  config: RateLimitConfig,
  userId?: string
) {
  const result = await checkRateLimit(
    rateLimitKey(prefix, request, userId),
    config
  );

  if (!result.allowed) {
    return apiError(
      "RATE_LIMITED",
      "Too many requests. Please wait a moment and try again.",
      429
    );
  }

  return null;
}

export function rateLimitHeaders(result: {
  remaining: number;
  resetAt: number;
}): HeadersInit {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
  };
}

/** Attach rate-limit headers to an existing response. */
export function applyRateLimitHeaders(
  response: NextResponse,
  result: { remaining: number; resetAt: number }
): NextResponse {
  const headers = rateLimitHeaders(result);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export { RATE_LIMITS };
