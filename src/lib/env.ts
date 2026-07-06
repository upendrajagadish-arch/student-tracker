import { ensureDatabaseEnv } from "@/lib/database-env";
import { z } from "zod";

const storageProviderSchema = z.enum(["local", "s3"]);

const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    SESSION_SECRET: z.string().optional(),
    AUTH_SECRET: z.string().optional(),
    STORAGE_PROVIDER: storageProviderSchema.default("local"),
    LOCAL_UPLOAD_DIR: z.string().default("uploads"),
    MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().default(5),
    APP_URL: z
      .string()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined))
      .pipe(z.string().url().optional()),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_ENDPOINT: z
      .string()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined))
      .pipe(z.string().url().optional()),
    S3_KEY_PREFIX: z.string().default("resumes"),
  })
  .superRefine((env, ctx) => {
    const secret = env.SESSION_SECRET ?? env.AUTH_SECRET;
    const isProd = env.NODE_ENV === "production";
    const weakSecrets = new Set([
      "change-me-in-production",
      "dev-secret-change-me",
      "secret",
    ]);

    // Defer hard failure to getSessionSecret() at sign-in time so public pages
    // (/, /login) can still render when SESSION_SECRET is not yet configured.
    if (isProd && secret && secret.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "SESSION_SECRET or AUTH_SECRET must be at least 32 characters in production",
        path: ["SESSION_SECRET"],
      });
    } else if (isProd && secret && weakSecrets.has(secret)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Replace the default SESSION_SECRET before production deploy",
        path: ["SESSION_SECRET"],
      });
    }

    if (env.STORAGE_PROVIDER === "s3") {
      if (!env.S3_BUCKET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "S3_BUCKET is required when STORAGE_PROVIDER=s3",
          path: ["S3_BUCKET"],
        });
      }
      if (!env.S3_REGION) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "S3_REGION is required when STORAGE_PROVIDER=s3",
          path: ["S3_REGION"],
        });
      }
      if (!env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required when STORAGE_PROVIDER=s3",
          path: ["S3_ACCESS_KEY_ID"],
        });
      }
    }

    if (
      env.DATABASE_URL.startsWith("postgresql://") ||
      env.DATABASE_URL.startsWith("postgres://")
    ) {
      // Hint only — Prisma schema provider must match (see docs/DEPLOYMENT.md)
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

function parseServerEnv(): ServerEnv {
  ensureDatabaseEnv();
  return serverEnvSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    AUTH_SECRET: process.env.AUTH_SECRET,
    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
    LOCAL_UPLOAD_DIR: process.env.LOCAL_UPLOAD_DIR,
    MAX_UPLOAD_SIZE_MB: process.env.MAX_UPLOAD_SIZE_MB,
    APP_URL: process.env.APP_URL,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_REGION: process.env.S3_REGION,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_KEY_PREFIX: process.env.S3_KEY_PREFIX,
  });
}

/** Validated server environment — never import from client components. */
export function getServerEnv(): ServerEnv {
  if (!cachedEnv) {
    cachedEnv = parseServerEnv();
  }
  return cachedEnv;
}

/** Resolve session signing secret (SESSION_SECRET preferred, AUTH_SECRET fallback). */
export function getSessionSecret(): string {
  const env = getServerEnv();
  const secret = env.SESSION_SECRET ?? env.AUTH_SECRET;

  if (secret && secret.length >= 32) {
    return secret;
  }

  if (env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET or AUTH_SECRET (32+ chars) is required in production"
    );
  }

  return "dev-only-insecure-session-secret-32chars";
}

export function validateServerEnv(): ServerEnv {
  return getServerEnv();
}

export function isPostgreSqlDatabaseUrl(url: string): boolean {
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

export function isSqliteDatabaseUrl(url: string): boolean {
  return url.startsWith("file:");
}
