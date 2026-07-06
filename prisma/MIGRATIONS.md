# Prisma migrations

## Local demo (SQLite)

Use **`db push`** — fast schema sync, no migration history:

```bash
npx prisma db push
npm run db:seed
```

This is the default workflow for local development and client demos.

## Production (PostgreSQL)

Use **`migrate`** — versioned, auditable schema changes:

### First-time production setup

1. Edit `prisma/schema.prisma` — set `provider = "postgresql"`.
2. Set `DATABASE_URL` to your PostgreSQL connection string.
3. Create the initial migration:

```bash
npx prisma migrate dev --name init
```

4. Deploy to production:

```bash
npx prisma migrate deploy
```

5. Seed demo data (optional, staging only):

```bash
npm run db:seed
```

### Before every production migration

- **Back up the database** (pg_dump or managed provider snapshot).
- Test migration against a staging copy first.
- Run `npm run build` after `prisma generate`.

## Switching from SQLite demo to PostgreSQL

The demo SQLite file (`dev.db`) is **not** migrated automatically. For production:

1. Provision PostgreSQL.
2. Switch Prisma provider to `postgresql`.
3. Run `migrate dev --name init` or `db push` on empty Postgres.
4. Re-seed or import students via CSV.

## Migration baseline (Phase 3B)

This repository ships with **SQLite for local demo** — no committed `prisma/migrations/` folder by default.

When you switch to PostgreSQL for production:

```bash
# 1. Set provider = "postgresql" in schema.prisma
# 2. Set DATABASE_URL to Postgres
npx prisma migrate dev --name init
git add prisma/migrations
git commit -m "Add initial PostgreSQL migration"
```

CI uses `db push` on SQLite — production CI/CD should run `npm run db:migrate:deploy` instead.

See [docs/BACKUP_RESTORE.md](../docs/BACKUP_RESTORE.md) before first production migration.

## Commands reference

| Command | Use case |
|---------|----------|
| `npx prisma generate` | Regenerate Prisma client after schema change |
| `npm run db:push` | Local SQLite demo — sync schema without migrations |
| `npm run db:migrate:dev` | Create/apply migrations in dev (PostgreSQL) |
| `npm run db:migrate:deploy` | Apply migrations in production CI/CD |
| `npm run db:seed` | Demo data (staging only — not real production) |
| `npm run build` | Production Next.js build |
| `npm run start` | Start production server (`next start`) |

See [docs/PRODUCTION_DEPLOYMENT_TRIAL.md](../docs/PRODUCTION_DEPLOYMENT_TRIAL.md) for the full pilot deployment walkthrough.
