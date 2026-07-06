# Coding Platform API Access Guide

PlacementIQ's **API Integration Center** lets Super Admins and TPO staff configure official coding-platform APIs for live sync where supported. This document explains platform availability, how to obtain access, and recommended college workflows.

## Platform-wise API availability

| Platform | Sync mode | Live API | Credentials | Notes |
|----------|-----------|----------|-------------|-------|
| **Codeforces** | Public API | Yes | None | Official public API; student handle required |
| **HackerRank** | Enterprise API | Planned | API key or token | HackerRank for Work / enterprise only |
| **HackerEarth** | Partner API | Planned | client_id + client_secret | Recruiter/test candidate reports |
| **LeetCode** | CSV only | No | — | No official public profile API |
| **CodeChef** | CSV only | No | — | Manual/CSV until official access |
| **GeeksforGeeks** | CSV only | No | — | Manual/CSV until official access |
| **Coding Ninjas** | Manual only | No | — | Partner API may require institutional agreement |
| **InterviewBit** | CSV only | No | — | Manual/CSV until official access |

## Codeforces — public API

Codeforces provides a free, documented public API:

- Base URL: `https://codeforces.com/api`
- Documentation: [codeforces.com/apiHelp](https://codeforces.com/apiHelp)
- **No API key required**
- Each student profile must include a valid Codeforces **handle**

### How to get Codeforces data

1. Open **Admin → API Integrations → Coding Platforms**
2. Enable the Codeforces integration
3. Click **Test connection** (default test handle: `tourist`)
4. Ensure each student has a Codeforces username on their coding profile
5. Use **Sync** on the student profile or bulk jobs when available

PlacementIQ calls official endpoints such as `user.info` — no scraping or unofficial APIs.

## HackerRank for Work API

HackerRank's enterprise / **HackerRank for Work** API is intended for assessments and hiring workflows, not public practice-profile scraping.

### How to request access

1. Contact HackerRank sales or your account manager
2. Request **HackerRank for Work API** access for your institution
3. Obtain an **API key** or **access token**
4. In Integration Center, save credentials under **HackerRank → Credentials**
5. Track vendor contact and approval in **Access request**

Documentation: [hackerrank.com/work/products/api](https://www.hackerrank.com/work/products/api)

**Important:** PlacementIQ does not use unofficial APIs to sync public HackerRank practice profiles.

## HackerEarth Recruiter / Partner API

HackerEarth provides partner APIs for recruiters to fetch candidate test reports.

### How to get client_id and client_secret

1. Sign up for **HackerEarth for Recruiters**
2. Open the recruiter dashboard → API integration settings
3. Copy **client_id** and **client_secret**
4. Save them in Integration Center under **HackerEarth → Credentials**
5. To test: provide a **test_id** and **candidate email** for the candidate report API

Documentation: [hackerearth.com/recruiters/api-integration](https://www.hackerearth.com/recruiters/api-integration/)

## Manual / CSV platforms

The following platforms do **not** have official public profile APIs enabled in PlacementIQ:

- LeetCode
- CodeChef
- GeeksforGeeks
- InterviewBit

**Coding Ninjas** may offer partner APIs through institutional agreements; until configured, use manual entry or CSV import.

For these platforms, the Integration Center shows:

> Live API sync is not supported yet. Use manual/CSV import.

Continue using **Coding Platforms → Import CSV** or per-student manual entry.

## Data privacy

- API credentials are **encrypted server-side** using `INTEGRATION_SECRET` (or `SESSION_SECRET` as fallback)
- Credentials are **never returned** to the browser after saving
- Audit logs record integration changes **without secret values**
- Only authorized roles (Super Admin, TPO) can configure credentials; HR is blocked

Store production secrets in environment variables or a secrets manager — not in client code or version control.

## Student consent

Before syncing coding-platform data:

1. Inform students that handles and assessment results may be stored for placement readiness
2. Collect institutional consent per your college policy
3. Use only **official APIs** or **student-provided / verified** data
4. Do not bypass CAPTCHAs or scrape websites

## Recommended college workflow

1. **Enable Codeforces** first — no vendor approval needed
2. **Request enterprise access** for HackerRank and HackerEarth in parallel; track status in Access Request
3. **Import CSV** for LeetCode, CodeChef, GFG, and InterviewBit until official APIs are approved
4. **Test connections** after credentials arrive; verify audit logs
5. **Train TPO staff** on manual verification for enterprise APIs when automated test endpoints are unavailable
6. Review integration status on the dashboard before bulk sync jobs

## Environment variables

```env
INTEGRATION_SECRET=""                    # 32+ chars; encrypts stored credentials
CODEFORCES_API_BASE_URL="https://codeforces.com/api"
HACKERRANK_API_BASE_URL="https://www.hackerrank.com/x/api/v3"
HACKEREARTH_API_BASE_URL="https://api.hackerearth.com/partner/hackerearth"
CODING_SYNC_REQUEST_DELAY_MS="500"
CODING_SYNC_BULK_LIMIT="50"
```

HackerRank and HackerEarth credentials are configured through the Integration Center UI — they are not required in `.env`.

## Security limitations

- Encryption protects credentials at rest but depends on a strong `INTEGRATION_SECRET`
- Codeforces public API is rate-limited; use `CODING_SYNC_REQUEST_DELAY_MS` for bulk sync
- HackerRank/HackerEarth live student sync requires additional provider implementation after credentials are verified
- No unofficial LeetCode or scraping-based sync is enabled by design
