import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getRequirementMatches } from "@/lib/services/company-matching";
import type { EligibilityStatus, MatchStatus } from "@/types/company";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "requirements:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);

  const result = await getRequirementMatches(id, {
    search: searchParams.get("search") ?? undefined,
    matchStatus: (searchParams.get("matchStatus") as MatchStatus) || undefined,
    eligibilityStatus:
      (searchParams.get("eligibilityStatus") as EligibilityStatus) || undefined,
    branch: searchParams.get("branch") ?? undefined,
    batch: searchParams.get("batch") ?? undefined,
    minScore: searchParams.get("minScore")
      ? Number(searchParams.get("minScore"))
      : undefined,
    maxScore: searchParams.get("maxScore")
      ? Number(searchParams.get("maxScore"))
      : undefined,
    missingSkill: searchParams.get("missingSkill") ?? undefined,
    page: Number(searchParams.get("page")) || 1,
  });

  return NextResponse.json(result);
}
