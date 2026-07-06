/**
 * Prisma requires DATABASE_URL to be set when the schema uses env("DATABASE_URL"),
 * even for `prisma generate` (no DB connection). This script supplies a local
 * SQLite default when the variable is missing (e.g. fresh clone, CI without .env).
 */
import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL?.trim()) {
  process.env.DATABASE_URL =
    "postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public";
  console.warn(
    "[PlacementIQ] DATABASE_URL was not set; using a placeholder for prisma generate only."
  );
}
if (!process.env.DIRECT_URL?.trim()) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

execSync("npx prisma generate", { stdio: "inherit" });
