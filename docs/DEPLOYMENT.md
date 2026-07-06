# PlacementIQ Deployment Guide

Production infrastructure guide. No product features — deployment, database, storage, and auth hardening.

**Pilot deployment walkthrough:** [PRODUCTION_DEPLOYMENT_TRIAL.md](./PRODUCTION_DEPLOYMENT_TRIAL.md) (PostgreSQL + S3 step-by-step).

## Prerequisites

- Node.js 20+ (22 recommended)
- PostgreSQL 14+ for production
- S3-compatible object storage for resume files (recommended)
- HTTPS reverse proxy (nginx, Caddy, load balancer)

## Quick reference

| Environment | Database | Schema command | Storage |
|-------------|----------|----------------|---------|
| Local demo | SQLite (`file:./dev.db`) | `db push` | Local `uploads/` |
| Staging | PostgreSQL | `migrate deploy` | S3 or local |
| Production | PostgreSQL | `migrate deploy` | S3 |

---

## 1. Environment variables

Copy `.env.example` to `.env` (local) or use [`.env.production.example`](../.env.production.example) / [`.env.docker.example`](../.env.docker.example) for deployment trials.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite or PostgreSQL connection string |
| `SESSION_SECRET` | Prod | 32+ char secret for signed session cookies |
| `NODE_ENV` | Yes | `development` or `production` |
| `APP_URL` | Prod | Public URL, e.g. `https://placementiq.example.edu` |
| `STORAGE_PROVIDER` | No | `local` (default) or `s3` |
| `LOCAL_UPLOAD_DIR` | No | Default `uploads` |
| `MAX_UPLOAD_SIZE_MB` | No | Default `5` |
| `S3_BUCKET` | If S3 | Bucket name |
| `S3_REGION` | If S3 | AWS region |
| `S3_ACCESS_KEY_ID` | If S3 | Access key |
| `S3_SECRET_ACCESS_KEY` | If S3 | Secret key |
| `S3_ENDPOINT` | No | Custom endpoint (MinIO, Cloudflare R2) |
| `S3_KEY_PREFIX` | No | Object key prefix, default `resumes` |
| `EXPORT_ROW_LIMIT` | No | Max Excel export rows (default 5000) |
| `REPORT_ROW_LIMIT` | No | Max report preview rows (default 500) |
| `PRINT_REPORT_ROW_LIMIT` | No | Max print report rows per section (default 200) |
| `BULK_READINESS_BATCH_SIZE` | No | Batch size for readiness recalc jobs (default 100) |

**Never expose server secrets to the browser.** Only `NEXT_PUBLIC_*` vars are client-safe (none required today).

Generate a production secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 2. PostgreSQL setup

### Local demo (unchanged)

```bash
# .env
DATABASE_URL="file:./dev.db"

npm run db:setup
npm run dev
```

### Production

1. Create database and user:

```sql
CREATE USER placementiq WITH PASSWORD 'strong-password';
CREATE DATABASE placementiq OWNER placementiq;
```

2. Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Set environment:

```env
DATABASE_URL="postgresql://placementiq:strong-password@host:5432/placementiq?schema=public"
```

4. Apply schema:

```bash
npx prisma generate
npx prisma migrate dev --name init    # first time only
npx prisma migrate deploy             # production CI/CD
```

See [prisma/MIGRATIONS.md](../prisma/MIGRATIONS.md) for migration discipline.

**Backup:** run `pg_dump` before every production migration.

---

## 3. File storage

### Local (development / Docker demo)

```env
STORAGE_PROVIDER=local
LOCAL_UPLOAD_DIR=uploads
```

Files stored at `{LOCAL_UPLOAD_DIR}/resumes/`. **Not suitable for multi-instance production** — use S3.

### S3-compatible (production recommended)

```env
STORAGE_PROVIDER=s3
S3_BUCKET=placementiq-resumes
S3_REGION=ap-south-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
# S3_ENDPOINT=https://...   # MinIO / R2 only
```

Implementation: `src/lib/storage/s3-provider.ts` (AWS SDK v3).

**Health check:** `GET /api/health` calls `checkStorageHealth()` — writes a tiny probe object, verifies access, deletes it. No credentials are exposed.

**R2 example:**

```env
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
```

**MinIO example:**

```env
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
```

---

## 4. Auth & sessions

- Bcrypt password hashing (unchanged)
- **Signed httpOnly cookies** using `SESSION_SECRET`
- `secure=true` in production
- `sameSite=lax`
- Logout clears cookie (`maxAge=0`)
- Login API returns safe user fields only (no password hash)

Replace demo credentials before go-live.

---

## 5. Build & start

```bash
npm ci
npx prisma generate
npm run build
npm run start
```

### Windows note

Stop the dev server before `npx prisma generate` if you see `EPERM` on `query_engine-windows.dll.node`.

Do not run `npm run build` and `npm run dev` simultaneously.

---

## 6. Docker

```bash
# Set a strong secret (or copy .env.docker.example to .env)
export SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"

docker compose up --build
```

See [PRODUCTION_DEPLOYMENT_TRIAL.md](./PRODUCTION_DEPLOYMENT_TRIAL.md) for full Docker trial steps.

- App: http://localhost:3000
- PostgreSQL: localhost:5432 (user/pass/db: `placementiq`)
- Uploads: Docker volume `uploads`

Entrypoint runs `prisma migrate deploy` (falls back to `db push` if no migrations exist).

**Seed demo data inside container:**

```bash
docker compose exec app npx tsx prisma/seed.ts
```

---

## 7. Platform notes

### Vercel

- Use **external PostgreSQL** (Neon, Supabase, RDS)
- Set all env vars in project settings
- Use **S3** for resumes (local disk is ephemeral)
- Run `prisma migrate deploy` in build step or separate CI job
- `output: "standalone"` is configured for self-hosted; Vercel uses its own runtime

### Render / Railway

- Add PostgreSQL plugin
- Set `DATABASE_URL`, `SESSION_SECRET`, S3 vars
- Build: `npm ci && npx prisma generate && npm run build`
- Release: `npx prisma migrate deploy`
- Start: `npm run start`

### Self-hosted (VM)

- Docker Compose (included) or systemd + Node
- nginx reverse proxy with TLS
- PostgreSQL on same host or managed service
- S3 for file storage

---

## 8. Performance (5,000 students)

- All list pages use pagination (default page size ≤ 50)
- Avoid loading full student lists in memory
- PostgreSQL indexes exist on `branch`, `batch`, `readinessScore`, etc.
- Future: batch readiness recalculation for very large imports

---

## 9. Post-deploy checklist

Run [docs/PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) after every production deploy.

---

## 10. Rollback

- Database: restore from backup snapshot
- App: redeploy previous container/image tag
- Storage: S3 versioning recommended for resume objects
