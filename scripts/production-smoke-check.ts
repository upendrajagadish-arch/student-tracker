/**
 * Production deployment smoke checks — run against a live instance.
 *
 * Usage:
 *   npm run smoke:production
 *   SMOKE_BASE_URL=https://placementiq.example.edu npm run smoke:production
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

interface CheckResult {
  name: string;
  pass: boolean;
  detail: string;
}

async function checkStatus(
  name: string,
  path: string,
  expectStatus: number | number[],
  init?: RequestInit
): Promise<CheckResult> {
  const expected = Array.isArray(expectStatus) ? expectStatus : [expectStatus];
  const method = init?.method ?? "GET";
  try {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual", ...init });
    const pass = expected.includes(res.status);
    return {
      name,
      pass,
      detail: pass
        ? `${method} ${path} → ${res.status}`
        : `${method} ${path} → ${res.status}, expected ${expected.join(" or ")}`,
    };
  } catch (error) {
    return {
      name,
      pass: false,
      detail: `${method} ${path} failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function checkHealth(): Promise<CheckResult> {
  try {
    const res = await fetch(`${BASE}/api/health`);
    const body = (await res.json()) as Record<string, unknown>;
    const pass =
      res.status === 200 &&
      body.status === "ok" &&
      body.database === "ok" &&
      body.storage === "ok" &&
      typeof body.version === "string" &&
      typeof body.environment === "string" &&
      typeof body.storageProvider === "string" &&
      typeof body.databaseProvider === "string";

    return {
      name: "Health endpoint (DB + storage)",
      pass,
      detail: pass
        ? `status=${body.status}, db=${body.database} (${body.databaseProvider}), storage=${body.storage} (${body.storageProvider}), v${body.version}`
        : JSON.stringify(body),
    };
  } catch (error) {
    return {
      name: "Health endpoint (DB + storage)",
      pass: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkBrandingApi(): Promise<CheckResult> {
  try {
    const res = await fetch(`${BASE}/api/branding`);
    const body = (await res.json()) as {
      success?: boolean;
      data?: { institutionName?: string; productName?: string };
    };
    const pass =
      res.status === 200 &&
      body.success === true &&
      typeof body.data?.institutionName === "string" &&
      typeof body.data?.productName === "string";

    return {
      name: "Public branding API",
      pass,
      detail: pass
        ? `institution="${body.data?.institutionName}", product="${body.data?.productName}"`
        : JSON.stringify(body),
    };
  } catch (error) {
    return {
      name: "Public branding API",
      pass: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  console.log(`PlacementIQ production smoke check → ${BASE}\n`);

  const results: CheckResult[] = [
    await checkHealth(),
    await checkStatus("Login page", "/login", 200),
    await checkBrandingApi(),
    await checkStatus("Home redirect (unauthenticated)", "/", [307, 302]),
    await checkStatus("Admin dashboard blocked", "/admin/dashboard", [307, 302]),
    await checkStatus("Admin reports print blocked", "/admin/reports/print", [307, 302]),
    await checkStatus("TPO students blocked", "/tpo/students", [307, 302]),
    await checkStatus("HR talent room blocked", "/hr/talent-room", [307, 302]),
    await checkStatus("HR admin route blocked", "/hr/dashboard", [307, 302]),
    await checkStatus("Students API blocked", "/api/students", 401),
    await checkStatus("Reports API blocked", "/api/reports", 401),
    await checkStatus("Reports export blocked", "/api/reports/export", 401),
    await checkStatus("Reports print-log blocked", "/api/reports/print-log", 401, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportType: "MANAGEMENT_SUMMARY" }),
    }),
    await checkStatus("Analytics export blocked", "/api/analytics/export", 401),
    await checkStatus("Branding settings API blocked", "/api/settings/branding", 401),
  ];

  let failed = 0;
  for (const r of results) {
    const icon = r.pass ? "✓" : "✗";
    console.log(`${icon} ${r.name}: ${r.detail}`);
    if (!r.pass) failed += 1;
  }

  console.log(`\n${results.length - failed}/${results.length} passed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();
