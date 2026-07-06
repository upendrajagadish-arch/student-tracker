# PlacementIQ Smoke Test Checklist

Manual QA checklist after setup, seed, or deployment. Mark each item pass/fail.

## Setup

- [ ] Copy `.env.example` to `.env`
- [ ] `npm install` completes without errors
- [ ] `npx prisma generate` succeeds
- [ ] `npx prisma db push` succeeds
- [ ] `npm run db:seed` completes (100 students, companies, shares)
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run dev` loads at http://localhost:3000

## Authentication

- [ ] Login as Super Admin → `/admin/dashboard`
- [ ] Login as TPO → `/tpo/dashboard`
- [ ] Login as Faculty → `/faculty/dashboard`
- [ ] Login as HR → `/hr/dashboard`
- [ ] Logout returns to `/login`
- [ ] Unauthenticated `/admin/students` redirects to login

## Role Protection

- [ ] HR visiting `/admin/analytics` redirects to `/hr/dashboard`
- [ ] Faculty visiting `/admin/audit-logs` redirects to `/faculty/dashboard`
- [ ] TPO cannot access `/admin/audit-logs` (redirect)
- [ ] Faculty analytics page loads but **Export to Excel** is hidden

## Students

- [ ] Student list paginates (not all rows on one page)
- [ ] Search/filter by branch works
- [ ] Create student (Admin/TPO)
- [ ] Edit student scores (Faculty)
- [ ] Student detail shows readiness, resume, tech stack

## Import / Export

- [ ] Import preview with sample CSV
- [ ] Import confirm adds/updates students
- [ ] Excel export downloads with filters applied

## Resumes

- [ ] Upload PDF resume on student detail
- [ ] Review/approve resume (Faculty/TPO)
- [ ] Download resume via protected API
- [ ] Resume list page filters work

## Tech Stack

- [ ] Add skill to student
- [ ] Verify skill (Faculty)
- [ ] Tech stack list page loads

## Readiness

- [ ] Recalculate readiness on student detail
- [ ] Readiness list shows distribution
- [ ] Dashboard shows readiness averages

## Company Matching

- [ ] Companies list populated after seed
- [ ] Requirement detail shows match results
- [ ] Run matching updates snapshots
- [ ] Export matching results

## HR Sharing

- [ ] Share students from requirement matching
- [ ] Shared Students list shows shares
- [ ] HR Talent Room lists shared candidates
- [ ] HR can update decision and comments
- [ ] Resume download blocked when not permitted

## Placement Passport

- [ ] Internal passport: generate + view (Admin/TPO)
- [ ] Faculty can view passport (no generate)
- [ ] HR passport when `allowPlacementPassport` enabled
- [ ] HR blocked message when passport disabled
- [ ] Print / Save as PDF opens browser print

## Analytics

- [ ] Analytics page shows overview cards
- [ ] HR funnel chart renders
- [ ] Branch readiness table populated
- [ ] Missing skills table populated
- [ ] Export analytics Excel (8 sheets)

## Demo Checklist

- [ ] `/admin/demo-checklist` shows 8+ items ready after seed
- [ ] `/tpo/demo-checklist` accessible

## Audit Logs

- [ ] Admin audit logs show login, share, passport events

## Infrastructure (Phase 3A–3B)

- [ ] `GET /api/health` returns `status: ok`, `database: ok`, `storage: ok`
- [ ] `npm run smoke` passes with dev server running
- [ ] Session cookie is signed (tampered cookie rejected)
- [ ] Logout clears session cookie
- [ ] Rate limit returns 429 on repeated login attempts (optional)
- [ ] Review: `docs/PRODUCTION_CHECKLIST.md`, `docs/OPERATIONS.md`

## Notes

| Date | Tester | Environment | Result |
|------|--------|-------------|--------|
|      |        |             |        |
