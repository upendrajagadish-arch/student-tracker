import { getServerEnv } from "@/lib/env";
import { LocalStorageProvider } from "./local-provider";
import { S3StorageProvider } from "./s3-provider";
import type { StorageProvider } from "./types";

let provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!provider) {
    const env = getServerEnv();
    if (env.STORAGE_PROVIDER === "s3") {
      provider = new S3StorageProvider(env);
    } else {
      provider = new LocalStorageProvider(env.LOCAL_UPLOAD_DIR);
    }
  }
  return provider;
}

/** Test hook — swap provider in unit tests */
export function setStorageProvider(next: StorageProvider): void {
  provider = next;
}

export function resetStorageProvider(): void {
  provider = null;
}

export { checkStorageHealth } from "./health";
export type { StorageHealthResult } from "./health";

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100);
}

export function buildResumeFileName(
  rollNumber: string,
  studentName: string,
  version: number,
  ext: string
): string {
  const roll = sanitizeFileName(rollNumber);
  const name = sanitizeFileName(studentName.replace(/\s+/g, "_"));
  const ts = Date.now();
  return `${roll}_${name}_v${version}_${ts}${ext}`;
}

export type { StorageProvider } from "./types";
