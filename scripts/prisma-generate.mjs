import { execSync } from "node:child_process";
import { ensureDatabaseEnv, loadEnvFiles } from "./load-env.mjs";

loadEnvFiles();
ensureDatabaseEnv();

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
