import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canRefreshSkillEvidence } from "@/lib/permissions";
import { generateSkillEvidenceForStudent } from "@/lib/services/skill-evidence";
import { getStudentById } from "@/lib/services/students";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canRefreshSkillEvidence(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const student = await getStudentById(id);
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const bundle = await generateSkillEvidenceForStudent(id, {
    actorUserId: session.id,
    actorRole: session.role,
  });

  return NextResponse.json(bundle);
}
