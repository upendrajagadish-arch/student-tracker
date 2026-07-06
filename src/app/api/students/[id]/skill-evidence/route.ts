import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canViewSkillEvidence } from "@/lib/permissions";
import { getSkillEvidenceForStudent } from "@/lib/services/skill-evidence";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canViewSkillEvidence(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const bundle = await getSkillEvidenceForStudent(id);
  return NextResponse.json(bundle);
}
