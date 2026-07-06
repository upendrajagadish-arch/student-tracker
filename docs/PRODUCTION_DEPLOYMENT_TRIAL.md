# Production Deployment Trial (Phase 3J)

Step-by-step guide to deploy PlacementIQ in a **production-like** environment with **PostgreSQL** and **S3-compatible object storage** before a controlled college pilot.

No new product features — deployment verification only.

## Overview

| Profile | Database | Storage | Use case |
|---------|----------|---------|----------|
| Local demo | SQLite (`file:./dev.db`) | Local `uploads/` | Development, client demos |
| Docker trial | PostgreSQL (Compose) | Local volume or S3 | Staging / integration test |
| Production pilot | PostgreSQL (managed) | S3 / R2 / MinIO | Controlled pilot deployment |

**Templates:**

- [`.env.production.example`](../.env.production.example) — production secrets template
- [`.env.docker.example`](../.env.docker.example) — Docker Compose trial
- [`.env.example`](../.env.example) — local SQLite demo

---

## 1. PostgreSQL setup

### 1.1 Provision database

```sql
CREATE USER placementiq WITH PASSWORD 'strong-password-here';
CREATE DATABASE placementiq OWNER placementiq;
GRANT ALL PRIVILEGES ON DATABASE placementiq TO placementiq;
```

Managed options: AWS RDS, Neon, Supabase, Railway, Render PostgreSQL.

### 1.2 Switch Prisma provider

Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"   // was "sqlite" for local demo
  url      = env("DATABASE_URL")
}
```

Set environment:

```env
DATABASE_URL="postgresql://placementiq:strong-password@host:5432/placementiq?schema=public"
```

> **Local demo unchanged:** keep `provider = "sqlite"` and `DATABASE_URL="file:./dev.db"` on your laptop.

### 1.3 First migration (PostgreSQL)

On a machine pointed at the **empty** PostgreSQL database:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Commit `prisma/migrations/` to version control.

### 1.4 Deploy schema to production

```bash
npx prisma generate
npx prisma migrate deploy
```

**Before every migration:** back up the database (`pg_dump` or provider snapshot). See [BACKUP_RESTORE.md](./BACKUP_RESTORE.md).

### 1.5 Seed demo data (staging only)

```bash
npm run db:seed
```

**Do not** seed production with demo passwords. If you seed staging, change all passwords immediately.

### 1.6 Command reference

| Step | Command |
|------|---------|
| Generate client | `npx prisma generate` |
| Local SQLite sync | `npx prisma db push` |
| Create migration (dev) | `npx prisma migrate dev --name <name>` |
| Apply migrations (prod) | `npx prisma migrate deploy` |
| Seed demo data | `npm run db:seed` |
| Production build | `npm run build` |
| Production start | `npm run start` |

See also [prisma/MIGRATIONS.md](../prisma/MIGRATIONS.md).

---

## 2. S3-compatible storage setup

Resume files and institution logos use the storage abstraction in `src/lib/storage/`.

### 2.1 AWS S3

```env
STORAGE_PROVIDER=s3
S3_BUCKET=placementiq-files
S3_REGION=ap-south-1
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=...
S3_KEY_PREFIX=placementiq
```

IAM policy (minimum): `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:HeadObject` on `arn:aws:s3:::placementiq-files/placementiq/*`.

### 2.2 Cloudflare R2

```env
STORAGE_PROVIDER=s3
S3_BUCKET=placementiq-files
S3_REGION=auto
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<R2 access key>
S3_SECRET_ACCESS_KEY=<R2 secret>
S3_KEY_PREFIX=placementiq
```

R2 requires `S3_ENDPOINT`. The provider uses path-style URLs when an endpoint is set.

### 2.3 MinIO (self-hosted)

```env
STORAGE_PROVIDER=s3
S3_BUCKET=placementiq
S3_REGION=us-east-1
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_KEY_PREFIX=placementiq
```

### 2.4 Storage health check

`GET /api/health` runs `checkStorageHealth()` — a tiny probe object is written, verified, and deleted. No secrets are returned.

For local storage, files live under `{LOCAL_UPLOAD_DIR}/resumes/`. **Not suitable for multi-instance production** — use S3.

---

## 3. Environment variables

Copy [`.env.production.example`](../.env.production.example) and fill in values:

| Variable | Required (prod) | Notes |
|----------|-----------------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | 32+ characters |
| `NODE_ENV` | Yes | `production` |
| `APP_URL` | Yes | Public HTTPS URL |
| `STORAGE_PROVIDER` | Yes | `s3` recommended |
| `S3_BUCKET` | If S3 | Bucket name |
| `S3_REGION` | If S3 | AWS region or `auto` for R2 |
| `S3_ACCESS_KEY_ID` | If S3 | Never expose to browser |
| `S3_SECRET_ACCESS_KEY` | If S3 | Never expose to browser |
| `S3_ENDPOINT` | Optional | R2, MinIO |
| `S3_KEY_PREFIX` | No | Default `resumes` in code; use `placementiq` in prod |
| `EXPORT_ROW_LIMIT` | No | Default 5000 |
| `REPORT_ROW_LIMIT` | No | Default 500 |
| `PRINT_REPORT_ROW_LIMIT` | No | Default 200 |
| `BULK_READINESS_BATCH_SIZE` | No | Default 100 |

Generate `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Build and start

```bash
npm ci
npx prisma generate
npm run build
npm run start
```

**Windows:** stop `npm run dev` before `npx prisma generate` if you see `EPERM` on the query engine DLL.

---

## 5. Docker deployment trial

### 5.1 Quick start

```bash
cp .env.docker.example .env
# Edit SESSION_SECRET in .env

docker compose up --build
```

- App: http://localhost:3000
- PostgreSQL: `localhost:5432` (user/pass/db: `placementiq`)
- Uploads: Docker volume `uploads` (persists across container restarts)

### 5.2 What Docker does

1. **Build:** switches Prisma provider to `postgresql`, runs `prisma generate` + `npm run build`
2. **Entrypoint:** runs `prisma migrate deploy` (falls back to `db push` if no migrations folder)
3. **Start:** `node server.js` on port 3000
4. **Health:** app healthcheck hits `/api/health`

### 5.3 Seed inside container

```bash
docker compose exec app npx tsx prisma/seed.ts
```

### 5.4 S3 in Docker

Set `STORAGE_PROVIDER=s3` and S3 vars in `.env`. Remove reliance on the `uploads` volume for file persistence.

### 5.5 Local storage warning

With `STORAGE_PROVIDER=local`, files are stored in the `uploads` volume. This is fine for a **single-container trial** but not for horizontally scaled production.

---

## 6. Production smoke test

With the app running:

```bash
# Local production server
npm run smoke:production

# Remote / staging
SMOKE_BASE_URL=https://staging.placementiq.example.edu npm run smoke:production
```

Checks:

- `/api/health` — database, storage, version, providers
- `/login` loads
- `/api/branding` returns institution metadata
- Protected pages redirect unauthenticated users
- Protected APIs return 401
- HR and admin routes blocked without session

All checks must pass before pilot go-live.

---

## 7. Manual verification checklist

After smoke test passes, verify manually:

### 7.1 Resume upload / download

1. Log in as TPO or Super Admin
2. Open a student → upload resume (PDF)
3. Download resume — file opens correctly
4. Restart app — file still available (S3 or Docker volume)

### 7.2 Report export

1. Admin → Reports → export Excel
2. Open file — institution name in header rows (if branding configured)
3. Large exports respect `EXPORT_ROW_LIMIT`

### 7.3 Print report

1. Admin → Reports → Print / PDF view
2. Institution branding in header/footer
3. Unauthenticated `/admin/reports/print` redirects to login

### 7.4 HR Talent Room

1. Log in as HR — talent room loads
2. HR cannot access `/admin/dashboard` (redirects to HR dashboard)
3. Share link / passport works per permissions

### 7.5 Placement Passport

1. TPO → student → Placement Passport
2. Institution name, placement cell, logo (if uploaded) visible

### 7.6 Branding settings

1. Super Admin → Settings → Branding — save works
2. TPO can view but not edit
3. HR has no branding settings access

---

## 8. Rollback

| Component | Rollback action |
|-----------|-----------------|
| Application | Redeploy previous container image or release tag |
| Database | Restore from `pg_dump` / snapshot taken before migration |
| Storage | S3 versioning recommended; delete bad objects if needed |
| Config | Revert env vars in secrets manager |

**Always take a database backup before `prisma migrate deploy`.**

---

## 9. Backup warning

- **PostgreSQL:** automate daily snapshots; test restore quarterly
- **S3:** enable versioning on the bucket
- **Sessions:** no backup needed — users re-login after deploy
- **Never** rely on container ephemeral disk for resumes in production

See [BACKUP_RESTORE.md](./BACKUP_RESTORE.md).

---

## 10. Related docs

- [DEPLOYMENT.md](./DEPLOYMENT.md) — platform notes (Vercel, Render, self-hosted)
- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) — post-deploy regression list
- [OPERATIONS.md](./OPERATIONS.md) — logging, rate limits, jobs
- [PILOT_READINESS.md](./PILOT_READINESS.md) — 5,000-student scale notes
