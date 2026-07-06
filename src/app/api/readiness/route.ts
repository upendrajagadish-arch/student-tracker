import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getReadinessOverview } from "@/lib/services/readiness";
import type { ReadinessStatus, RiskLevel } from "@/types/readiness";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "readiness:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const result = await getReadinessOverview({
    search: searchParams.get("search") ?? undefined,
    branch: searchParams.get("branch") ?? undefined,
    batch: searchParams.get("batch") ?? undefined,
    riskLevel: (searchParams.get("riskLevel") as RiskLevel) ?? undefined,
    readinessStatus:
      (searchParams.get("readinessStatus") as ReadinessStatus) ?? undefined,
    minScore: searchParams.get("minScore")
      ? Number(searchParams.get("minScore"))
      : undefined,
    maxScore: searchParams.get("maxScore")
      ? Number(searchParams.get("maxScore"))
      : undefined,
    page: Number(searchParams.get("page")) || 1,
  });

  return NextResponse.json(result);
}
