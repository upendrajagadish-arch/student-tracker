import { getServerEnv } from "@/lib/env";
import { getStorageProvider } from "./index";

const PROBE_KEY = ".health-check-probe";

export type StorageHealthStatus = "ok" | "error";

export interface StorageHealthResult {
  status: StorageHealthStatus;
  provider: "local" | "s3";
  checkedAt: string;
}

/**
 * Verifies read/write access to the configured storage backend.
 * Uses a tiny probe object that is always removed after the check.
 * Never logs or returns credentials.
 */
export async function checkStorageHealth(): Promise<StorageHealthResult> {
  const env = getServerEnv();
  const checkedAt = new Date().toISOString();

  try {
    const storage = getStorageProvider();

    await storage.save(PROBE_KEY, Buffer.from("ok"));

    if (env.STORAGE_PROVIDER === "s3") {
      await storage.read(PROBE_KEY);
    } else {
      const exists = await storage.exists(PROBE_KEY);
      if (!exists) {
        return { status: "error", provider: env.STORAGE_PROVIDER, checkedAt };
      }
    }

    await storage.remove(PROBE_KEY);

    return { status: "ok", provider: env.STORAGE_PROVIDER, checkedAt };
  } catch {
    return { status: "error", provider: env.STORAGE_PROVIDER, checkedAt };
  }
}
