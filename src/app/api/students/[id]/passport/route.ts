import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  canGeneratePassport,
  canViewPassport,
} from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { generatePassportSnapshot } from "@/lib/services/placement-passport";
import { getStudentById } from "@/lib/services/students";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (
    !session ||
    !canViewPassport(session.role) ||
    !canGeneratePassport(session.role)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: studentId } = await params;
  const student = await getStudentById(studentId);
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  let requirementId: string | null = null;
  try {
    const body = await request.json();
    requirementId = body.requirementId ?? null;
  } catch {
    // optional body
  }

  const passport = await generatePassportSnapshot({
    studentId,
    generatedByUserId: session.id,
    companyRequirementId: requirementId,
  });

  await logAudit({
    actorUserId: session.id,
    actorRole: session.role,
    action: "PLACEMENT_PASSPORT_GENERATED",
    entityType: "PlacementPassportSnapshot",
    entityId: passport.id,
    description: `Generated placement passport for ${student.fullName}`,
  });

  return NextResponse.json({ passport });
}
