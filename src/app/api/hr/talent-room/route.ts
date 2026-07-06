import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getHrTalentRoom } from "@/lib/services/student-sharing";
import type { HRDecision } from "@/types/sharing";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "talent:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const result = await getHrTalentRoom(session.id, {
    companyId: searchParams.get("companyId") ?? undefined,
    requirementId: searchParams.get("requirementId") ?? undefined,
    matchStatus: searchParams.get("matchStatus") ?? undefined,
    readinessStatus: searchParams.get("readinessStatus") ?? undefined,
    hrDecision: (searchParams.get("hrDecision") as HRDecision) || undefined,
    branch: searchParams.get("branch") ?? undefined,
    skill: searchParams.get("skill") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    page: Number(searchParams.get("page")) || 1,
  });

  return NextResponse.json(result);
}
