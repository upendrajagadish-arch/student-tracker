import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { addRoleInterest } from "@/lib/services/tech-stack";
import { roleInterestSchema } from "@/lib/validations/tech-stack";
import { triggerReadinessRecalculation } from "@/lib/services/readiness";
import { getStudentById } from "@/lib/services/students";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "techstack:manage_skills")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: studentId } = await params;
  const student = await getStudentById(studentId);
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = roleInterestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const interest = await addRoleInterest(studentId, parsed.data);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "ROLE_INTEREST_ADDED",
      entityType: "StudentRoleInterest",
      entityId: interest.id,
      description: `Added role interest ${interest.roleName} for ${student.fullName}`,
    });

    await triggerReadinessRecalculation(studentId);

    return NextResponse.json(interest, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Role interest already exists" },
      { status: 409 }
    );
  }
}
