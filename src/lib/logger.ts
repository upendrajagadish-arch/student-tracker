type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogContext {
  action?: string;
  route?: string;
  userId?: string;
  role?: string;
  entityType?: string;
  entityId?: string;
  ip?: string;
  [key: string]: unknown;
}

const REDACTED_KEYS = new Set([
  "password",
  "passwordhash",
  "password_hash",
  "session",
  "cookie",
  "authorization",
  "token",
  "secret",
  "session_secret",
  "auth_secret",
  "s3_secret_access_key",
  "file",
  "buffer",
  "resume",
]);

function sanitizeValue(key: string, value: unknown): unknown {
  const lower = key.toLowerCase();
  if (REDACTED_KEYS.has(lower)) {
    return "[REDACTED]";
  }
  if (lower.includes("password") || lower.includes("secret") || lower.includes("token")) {
    return "[REDACTED]";
  }
  return value;
}

function sanitizeContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;

  const out: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (value === undefined) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = sanitizeContext(value as LogContext);
    } else {
      out[key] = sanitizeValue(key, value);
    }
  }
  return out;
}

export function sanitizeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(process.env.NODE_ENV !== "production" && error.stack
        ? { stack: error.stack }
        : {}),
    };
  }
  return { message: String(error) };
}

function writeLog(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown
) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: "placementiq",
    ...sanitizeContext(context),
    ...(error ? { error: sanitizeError(error) } : {}),
  };

  const line = JSON.stringify(entry);

  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "debug":
      if (process.env.NODE_ENV !== "production") {
        console.debug(line);
      }
      break;
    default:
      console.log(line);
  }
}

export const logger = {
  info(message: string, context?: LogContext) {
    writeLog("info", message, context);
  },
  warn(message: string, context?: LogContext, error?: unknown) {
    writeLog("warn", message, context, error);
  },
  error(message: string, context?: LogContext, error?: unknown) {
    writeLog("error", message, context, error);
  },
  debug(message: string, context?: LogContext) {
    writeLog("debug", message, context);
  },
  audit(message: string, context?: LogContext) {
    writeLog("info", message, { ...context, audit: true });
  },
};
