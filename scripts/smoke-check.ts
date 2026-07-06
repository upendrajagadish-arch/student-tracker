/**
 * Lightweight smoke checks — run while dev server is up.
 * Usage: npm run smoke
 *        SMOKE_BASE_URL=http://localhost:3000 npm run smoke
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

interface CheckResult {
  name: string;
  pass: boolean;
  detail: string;
}

async function check(
  name: string,
  path: string,
  expectStatus: number | number[]
): Promise<CheckResult> {
  const expected = Array.isArray(expectStatus) ? expectStatus : [expectStatus];
  try {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    const pass = expected.includes(res.status);
    return {
      name,
      pass,
      detail: pass
        ? `GET ${path} → ${res.status}`
        : `GET ${path} → ${res.status}, expected ${expected.join(" or ")}`,
    };
  } catch (error) {
    return {
      name,
      pass: false,
      detail: `GET ${path} failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function checkHealth(): Promise<CheckResult> {
  try {
    const res = await fetch(`${BASE}/api/health`);
    const body = await res.json();
    const pass =
      res.status === 200 &&
      body.status === "ok" &&
      body.database === "ok" &&
      body.storage === "ok";
    return {
      name: "Health endpoint",
      pass,
      detail: pass
        ? `status=${body.status}, db=${body.database}, storage=${body.storage}`
        : JSON.stringify(body),
    };
  } catch (error) {
    return {
      name: "Health endpoint",
      pass: false,
      detail: String(error),
    };
  }
}

async function main() {
  console.log(`PlacementIQ smoke check → ${BASE}\n`);

  const results: CheckResult[] = [
    await check("Login page", "/login", 200),
    await checkHealth(),
    await check("Home redirect", "/", [307, 302]),
    await check("Protected admin dashboard", "/admin/dashboard", [307, 302]),
    await check("Protected students API", "/api/students", 401),
    await check("Protected analytics export", "/api/analytics/export", 401),
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
