/**
 * Map Vercel/Supabase integration env names to Prisma's DATABASE_URL + DIRECT_URL.
 * Safe to call multiple times.
 */
export function ensureDatabaseEnv(): void {
  if (!process.env.DATABASE_URL?.trim()) {
    const pooled =
      process.env.POSTGRES_PRISMA_URL?.trim() ||
      process.env.POSTGRES_URL?.trim();
    if (pooled) {
      process.env.DATABASE_URL = pooled;
    }
  }

  if (!process.env.DIRECT_URL?.trim()) {
    const direct =
      process.env.POSTGRES_URL_NON_POOLING?.trim() ||
      process.env.POSTGRES_URL?.trim() ||
      process.env.DATABASE_URL?.trim();
    if (direct) {
      process.env.DIRECT_URL = direct;
    }
  }
}

ensureDatabaseEnv();
