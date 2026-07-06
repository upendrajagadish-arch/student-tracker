import { NextResponse } from "next/server";
import { parseApiErrorMessage } from "@/lib/api-errors";
import { logger } from "@/lib/logger";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  logContext?: {
    route?: string;
    action?: string;
    cause?: unknown;
  }
) {
  if (logContext?.cause) {
    logger.error(message, { route: logContext.route, action: logContext.action }, logContext.cause);
  }

  const body: ApiErrorBody = {
    success: false,
    error: { code, message },
  };

  return NextResponse.json(body, { status });
}

export function apiErrorFromUnknown(
  error: unknown,
  options: {
    route: string;
    action?: string;
    fallbackMessage?: string;
    fallbackCode?: ApiErrorCode;
  }
) {
  const isProd = process.env.NODE_ENV === "production";
  const message =
    error instanceof Error && !isProd
      ? error.message
      : options.fallbackMessage ?? "An unexpected error occurred. Please try again.";

  logger.error(
    options.fallbackMessage ?? "API request failed",
    { route: options.route, action: options.action },
    error
  );

  return apiError(
    options.fallbackCode ?? "INTERNAL_ERROR",
    message,
    500
  );
}

export function getLegacyErrorMessage(body: unknown): string | undefined {
  const msg = parseApiErrorMessage(body, "");
  return msg || undefined;
}
