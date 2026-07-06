import { execSync } from "node:child_process";
import { ensureDatabaseEnv, loadEnvFiles } from "./load-env.mjs";

loadEnvFiles();
ensureDatabaseEnv();

const args = process.argv.slice(2).join(" ");
if (!args) {
  console.error("Usage: node scripts/run-prisma.mjs <prisma args>");
  process.exit(1);
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error(
    "[PlacementIQ] DATABASE_URL is required. Set it in .env or use Vercel/Supabase POSTGRES_PRISMA_URL."
  );
  process.exit(1);
}

execSync(`npx prisma ${args}`, { stdio: "inherit" });
