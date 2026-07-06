import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const eq = trimmed.indexOf("=");
  if (eq === -1) return null;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

export function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const filePath = resolve(process.cwd(), name);
    if (!existsSync(filePath)) continue;
    for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;
      if (process.env[parsed.key] === undefined) {
        process.env[parsed.key] = parsed.value;
      }
    }
  }
}

export function ensureDatabaseEnv() {
  if (!process.env.DATABASE_URL?.trim()) {
    const pooled =
      process.env.POSTGRES_PRISMA_URL?.trim() ||
      process.env.POSTGRES_URL?.trim();
    if (pooled) process.env.DATABASE_URL = pooled;
  }

  if (!process.env.DIRECT_URL?.trim()) {
    const direct =
      process.env.POSTGRES_URL_NON_POOLING?.trim() ||
      process.env.POSTGRES_URL?.trim() ||
      process.env.DATABASE_URL?.trim();
    if (direct) process.env.DIRECT_URL = direct;
  }
}

loadEnvFiles();
ensureDatabaseEnv();
