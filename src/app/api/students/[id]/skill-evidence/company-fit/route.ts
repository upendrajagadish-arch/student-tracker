import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canViewSkillEvidence } from "@/lib/permissions";
import { getCompanySkillEvidenceFit } from "@/lib/services/skill-evidence";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canViewSkillEvidence(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const requirementId = searchParams.get("requirementId");
  if (!requirementId) {
    return NextResponse.json(
      { error: "requirementId is required" },
      { status: 400 }
    );
  }

  const fit = await getCompanySkillEvidenceFit(id, requirementId);
  if (!fit) {
    return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
  }

  return NextResponse.json(fit);
}
