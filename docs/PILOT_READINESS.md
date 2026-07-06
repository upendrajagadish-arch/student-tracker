# PlacementIQ Pilot Readiness Guide

This guide helps TPO/Admin teams prepare PlacementIQ for a college pilot with up to **5,000 students**.

## Quick start

```bash
# 1. Normal demo seed (users, 100 students, companies)
npm run db:seed

# 2. Large pilot load (adds 5,000 students — does NOT replace demo seed)
npm run seed:large

# 3. Start app
npm run dev

# 4. Smoke / timing check (dev server must be running)
npm run pilot:smoke
```

Open **Admin → Pilot Checklist** (`/admin/pilot-checklist`) to verify environment readiness.

---

## Seeding 5,000 students

| Script | Command | Purpose |
|--------|---------|---------|
| Demo seed | `npm run db:seed` | 100 students, users, companies, HR shares |
| Large pilot seed | `npm run seed:large` | Adds 5,000 pilot students with skills, resumes, readiness, matching, drives |

**Large seed creates:**
- 5,000 students (`pilot.*@demo.college.edu` emails)
- Tech stack skills and role interests
- Readiness snapshots (bulk, no per-student recalc)
- Resumes (~75% of students)
- Company matching on 6 active requirements
- 1 placement drive with ~400 pipeline stages
- ~80 HR shares

**Notes:**
- Run `db:seed` first for demo users and companies
- Re-running `seed:large` skips creation if 5,000 pilot students already exist
- Matching on 5,000 students may take several minutes
- Use **PostgreSQL** for pilot/production (SQLite is dev-only)

---

## Pages to test manually

After seeding, verify these pages load in under ~3 seconds with filters applied:

| Page | Path | What to check |
|------|------|----------------|
| Students | `/admin/students` | Pagination, branch/batch filters |
| Resumes | `/admin/resumes` | List loads, filters work |
| Tech Stack | `/admin/tech-stack` | Dashboard stats, student skills |
| Readiness | `/admin/readiness` | Paginated list, bulk recalc message |
| Companies | `/admin/companies` | Company cards |
| Matching | `/admin/companies/[id]/requirements/[id]` | Match results paginated |
| Shared Students | `/admin/shared-students` | HR share list |
| Placement Drives | `/admin/placement-drives` | Drive list + detail funnel |
| Analytics | `/admin/analytics` | Charts and tables render |
| Reports | `/admin/reports` | All 9 report types preview |
| Pilot Checklist | `/admin/pilot-checklist` | Green checks |

---

## Expected acceptable behavior

- **List pages:** 20–50 rows per page, server-side pagination
- **Search/filters:** Applied on server, not client-side on full dataset
- **Bulk readiness recalc:** Processes in batches of 100; may take minutes at 5,000 scale
- **Company matching run:** Uses batched inserts; one requirement against 5,000 students may take 1–3 minutes
- **Exports:** Capped at `EXPORT_ROW_LIMIT` (default 5,000); returns HTTP 413 with clear message if exceeded
- **Reports preview:** Capped at `REPORT_ROW_LIMIT` (default 500 rows per section) with UI warning

---

## Background jobs

Long-running operations (bulk readiness, company matching, large imports) create **tracked jobs** visible at `/admin/jobs` or `/tpo/jobs`.

- Jobs run in the **same Node process** after the API responds (request-driven mode)
- Poll progress on the source page or open **Background Jobs** in the sidebar
- Requires persistent server (`npm run start` / Docker) — not serverless-safe
- See [OPERATIONS.md](./OPERATIONS.md) for failure recovery and future queue plans

---

## Known limits

| Limit | Default | Env variable |
|-------|---------|--------------|
| Excel export rows | 5,000 | `EXPORT_ROW_LIMIT` |
| Report preview rows | 500 | `REPORT_ROW_LIMIT` |
| Bulk stage update | 200 students | — |
| Bulk HR share | 500 matches | — |
| Bulk readiness batch | 100 students | `BULK_READINESS_BATCH_SIZE` |
| Matching export | Same as export limit | `EXPORT_ROW_LIMIT` |

When an export exceeds the limit, the API returns a **clear error message** — apply branch/batch filters to reduce scope.

---

## Production recommendations

### PostgreSQL (required for pilot)

```env
DATABASE_URL="postgresql://user:pass@host:5432/placementiq"
```

Run migrations after schema changes:

```bash
npx prisma db push
# or
npm run db:migrate:deploy
```

### S3 storage (recommended for production)

```env
STORAGE_PROVIDER=s3
S3_BUCKET=your-bucket
S3_REGION=ap-south-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

### Export size guidance

- Full 5,000 student export: ~5–15 MB Excel, 30–90 seconds
- Prefer filtered exports (branch/batch) for daily operations
- Drive pipeline exports typically smaller (100–500 rows)

### Backup requirement

Before pilot go-live:
1. Backup PostgreSQL daily (see `docs/BACKUP_RESTORE.md`)
2. Backup S3 bucket or local `uploads/` directory
3. Document restore procedure with TPO team

---

## Pilot deployment checklist

- [ ] PostgreSQL provisioned and `DATABASE_URL` set
- [ ] `SESSION_SECRET` ≥ 32 characters (production)
- [ ] S3 storage configured for resumes
- [ ] `npm run db:seed` + `npm run seed:large` on staging
- [ ] `/admin/pilot-checklist` shows 10+ green checks
- [ ] `npm run pilot:smoke` passes
- [ ] Manual walkthrough of drive creation + stage updates
- [ ] Export tested with branch filter
- [ ] HR user verified blocked from internal routes
- [ ] Backup schedule configured
- [ ] TPO trained on bulk operation limits

---

## Troubleshooting

| Issue | Action |
|-------|--------|
| Slow readiness page | Ensure DB indexes applied (`npx prisma db push`) |
| Export fails with 413 | Add branch/batch filter or raise `EXPORT_ROW_LIMIT` |
| Matching timeout | Run per requirement; use PostgreSQL not SQLite |
| seed:large slow | Expected 10–20 min for full 5,000 + matching |
| prisma generate EPERM | Stop dev server, retry generate |

---

## Related docs

- `docs/DEPLOYMENT.md` — production deployment
- `docs/BACKUP_RESTORE.md` — backup procedures
- `docs/PRODUCTION_CHECKLIST.md` — infrastructure checklist
