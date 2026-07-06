import { prisma } from "@/lib/db";
import {
  getServerEnv,
  isPostgreSqlDatabaseUrl,
  isSqliteDatabaseUrl,
} from "@/lib/env";
import { checkStorageHealth } from "@/lib/storage/health";
import { logger } from "@/lib/logger";
import packageJson from "../../package.json";

export type HealthStatus = "ok" | "degraded" | "error";

export type DatabaseProvider = "sqlite" | "postgresql" | "unknown";

export interface HealthCheckResult {
  status: HealthStatus;
  database: HealthStatus;
  storage: HealthStatus;
  environment: string;
  timestamp: string;
  version: string;
  storageProvider: string;
  databaseProvider: DatabaseProvider;
}

function resolveDatabaseProvider(url: string): DatabaseProvider {
  if (isSqliteDatabaseUrl(url)) return "sqlite";
  if (isPostgreSqlDatabaseUrl(url)) return "postgresql";
  return "unknown";
}

async function checkDatabase(): Promise<HealthStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch (error) {
    logger.error("Health check: database unreachable", { action: "health_check" }, error);
    return "error";
  }
}

export async function getHealthStatus(): Promise<HealthCheckResult> {
  const env = getServerEnv();
  const [database, storageHealth] = await Promise.all([
    checkDatabase(),
    checkStorageHealth(),
  ]);

  const storage: HealthStatus = storageHealth.status;

  let status: HealthStatus = "ok";
  if (database === "error" || storage === "error") {
    status = "error";
  } else if (database === "degraded") {
    status = "degraded";
  }

  return {
    status,
    database,
    storage,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    version: packageJson.version,
    storageProvider: env.STORAGE_PROVIDER,
    databaseProvider: resolveDatabaseProvider(env.DATABASE_URL),
  };
}
