/**
 * Lightweight pilot performance smoke check.
 * Usage: npm run pilot:smoke
 *        SMOKE_BASE_URL=http://localhost:3000 npm run pilot:smoke
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const SLOW_MS = Number(process.env.PILOT_SLOW_MS ?? 3000);

interface TimedCheck {
  name: string;
  path: string;
  pass: boolean;
  ms: number;
  detail: string;
}

async function timedGet(path: string, expect: number | number[]): Promise<TimedCheck> {
  const expected = Array.isArray(expect) ? expect : [expect];
  const start = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    const ms = Date.now() - start;
    const pass = expected.includes(res.status);
    const slow = ms > SLOW_MS;
    return {
      name: path,
      path,
      pass: pass && !slow,
      ms,
      detail: pass
        ? slow
          ? `HTTP ${res.status} in ${ms}ms (slow — review query/indexes)`
          : `HTTP ${res.status} in ${ms}ms`
        : `HTTP ${res.status} in ${ms}ms, expected ${expected.join(" or ")}`,
    };
  } catch (error) {
    return {
      name: path,
      path,
      pass: false,
      ms: Date.now() - start,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkHealth(): Promise<TimedCheck> {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE}/api/health`);
    const body = await res.json();
    const ms = Date.now() - start;
    const pass =
      res.status === 200 &&
      body.status === "ok" &&
      body.database === "ok" &&
      ms <= SLOW_MS;
    return {
      name: "/api/health",
      path: "/api/health",
      pass,
      ms,
      detail: `status=${body.status}, db=${body.database}, storage=${body.storage} (${ms}ms)`,
    };
  } catch (error) {
    return {
      name: "/api/health",
      path: "/api/health",
      pass: false,
      ms: Date.now() - start,
      detail: String(error),
    };
  }
}

async function main() {
  console.log(`PlacementIQ pilot smoke → ${BASE}`);
  console.log(`Slow threshold: ${SLOW_MS}ms\n`);

  const checks: TimedCheck[] = [
    await checkHealth(),
    await timedGet("/api/students?page=1", 401),
    await timedGet("/api/readiness?page=1", 401),
    await timedGet("/api/companies?page=1", 401),
    await timedGet("/api/placement-drives?page=1", 401),
    await timedGet("/api/reports?type=FINAL_PLACEMENT_OUTCOME", 401),
    await timedGet("/admin/students", [307, 302]),
    await timedGet("/admin/readiness", [307, 302]),
    await timedGet("/admin/analytics", [307, 302]),
    await timedGet("/admin/reports", [307, 302]),
    await timedGet("/admin/placement-drives", [307, 302]),
    await timedGet("/admin/pilot-checklist", [307, 302]),
  ];

  let failed = 0;
  for (const c of checks) {
    const icon = c.pass ? "✓" : "✗";
    console.log(`${icon} ${c.name}: ${c.detail}`);
    if (!c.pass) failed += 1;
  }

  const avg =
    checks.reduce((sum, c) => sum + c.ms, 0) / Math.max(checks.length, 1);
  console.log(`\nAverage response: ${Math.round(avg)}ms`);
  console.log(`${checks.length - failed}/${checks.length} passed`);

  if (failed > 0) process.exit(1);
}

main();
