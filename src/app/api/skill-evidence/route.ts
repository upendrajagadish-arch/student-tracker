import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canViewSkillEvidence } from "@/lib/permissions";
import { getSkillEvidenceOverview } from "@/lib/services/skill-evidence";
import type { EvidenceSource, EvidenceStrength } from "@/types/skill-evidence";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !canViewSkillEvidence(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const result = await getSkillEvidenceOverview({
    search: searchParams.get("search") ?? undefined,
    branch: searchParams.get("branch") ?? undefined,
    batch: searchParams.get("batch") ?? undefined,
    evidenceStrength:
      (searchParams.get("evidenceStrength") as EvidenceStrength) || undefined,
    skillCategory: searchParams.get("skillCategory") ?? undefined,
    evidenceSource:
      (searchParams.get("evidenceSource") as EvidenceSource) || undefined,
    page: searchParams.get("page")
      ? Number(searchParams.get("page"))
      : undefined,
    pageSize: searchParams.get("pageSize")
      ? Number(searchParams.get("pageSize"))
      : undefined,
  });

  return NextResponse.json(result);
}
