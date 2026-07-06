# PlacementIQ

**Placement Intelligence OS** — internal placement tracking for colleges. Track student readiness, match candidates to company requirements, share verified profiles with HR, and monitor funnel analytics.

## Tech Stack

- Next.js 15 (App Router) · TypeScript · Tailwind CSS
- Prisma ORM · SQLite (dev) / PostgreSQL (production)
- ExcelJS · Recharts · bcrypt · Zod · AWS SDK (S3 storage)

## Quick Start (Local Demo)

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Clean dev start (Windows):** if you see webpack/cache errors, run:

```bash
npm run dev:clean
```

**Windows EPERM:** stop the dev server before `npx prisma generate` if the query engine DLL is locked.

Do not run `npm run build` and `npm run dev` simultaneously.

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@placementiq.edu | admin123 |
| TPO / Admin | tpo@placementiq.edu | tpo123 |
| Faculty | faculty@placementiq.edu | faculty123 |
| HR | hr@placementiq.edu | hr123 |

## Demo Setup

```bash
npm run db:seed
```

Verify at `/admin/demo-checklist` or `/tpo/demo-checklist`.

## Environment Variables

Copy `.env.example` to `.env`. Key variables:

| Variable | Local demo | Production |
|----------|------------|------------|
| `DATABASE_URL` | `file:./dev.db` | PostgreSQL URL |
| `SESSION_SECRET` | dev default OK | 32+ chars, required |
| `STORAGE_PROVIDER` | `local` | `s3` recommended |
| `APP_URL` | optional | public HTTPS URL |

Validated server-side in `src/lib/env.ts`. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full list.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run dev:clean` | Clear `.next` cache and start dev |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema (SQLite demo / dev) |
| `npm run db:migrate:dev` | Create migrations (PostgreSQL) |
| `npm run db:migrate:deploy` | Apply migrations (production) |
| `npm run db:seed` | Seed demo data |
| `npm run db:setup` | generate + push + seed |
| `npm run smoke` | Dev smoke check (server must be running) |
| `npm run smoke:production` | Production deployment smoke check |

## Production Deployment

**Full guide:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

**Pilot trial (PostgreSQL + S3):** [docs/PRODUCTION_DEPLOYMENT_TRIAL.md](docs/PRODUCTION_DEPLOYMENT_TRIAL.md)

**Environment templates:**

- [`.env.example`](.env.example) — local SQLite demo
- [`.env.production.example`](.env.production.example) — production PostgreSQL + S3
- [`.env.docker.example`](.env.docker.example) — Docker Compose trial

**Quick steps:**

1. Provision PostgreSQL
2. Set `provider = "postgresql"` in `prisma/schema.prisma`
3. Configure `.env` / host secrets (`DATABASE_URL`, `SESSION_SECRET`, S3)
4. `npx prisma migrate deploy`
5. `npm run build && npm run start`
6. Run [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md)

**Docker:**

```bash
export SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
docker compose up --build
```

### Database discipline

| Environment | Command |
|-------------|---------|
| Local demo | `db push` |
| Production | `migrate deploy` |

See [prisma/MIGRATIONS.md](prisma/MIGRATIONS.md).

### File storage

- **Local:** `STORAGE_PROVIDER=local` → `uploads/resumes/` (dev only)
- **Production:** `STORAGE_PROVIDER=s3` + S3 env vars

Providers: `src/lib/storage/` (`LocalStorageProvider`, `S3StorageProvider`).

## Feature Overview

| Phase | Features |
|-------|----------|
| 1–2H | Students, resumes, readiness, matching, HR, passport, analytics, demo polish |
| 3A | PostgreSQL readiness, env validation, signed sessions, S3 storage, Docker, deployment docs |
| 3B | Health check, structured logging, rate limiting, security headers, CI, smoke script |

## Operations

- Health: `GET /api/health` (database, storage, version, providers)
- Dev smoke: `npm run smoke` (dev server must be running)
- Production smoke: `SMOKE_BASE_URL=https://your-host npm run smoke:production`
- Ops guide: [docs/OPERATIONS.md](docs/OPERATIONS.md)
- Backup: [docs/BACKUP_RESTORE.md](docs/BACKUP_RESTORE.md)
- Pilot deployment: [docs/PRODUCTION_DEPLOYMENT_TRIAL.md](docs/PRODUCTION_DEPLOYMENT_TRIAL.md)

## Testing

| Feature | Admin | TPO | Faculty | HR |
|---------|-------|-----|---------|-----|
| Student CRUD | Full | Full | Scores only | — |
| Analytics | Full + export | Full + export | View only | — |
| HR Talent Room | — | — | — | Yes |
| Audit Logs | Yes | — | — | — |

## Testing

- Local QA: [docs/SMOKE_TEST_CHECKLIST.md](docs/SMOKE_TEST_CHECKLIST.md)
- Production: [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md)

## Known Limitations

- No student portal, email, AI, or external platform sync
- SQLite for local demo only; PostgreSQL for ~5,000+ students
- Replace demo credentials before production

## Sample Import

Sample CSV: `/sample-student-import.csv`
