import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import {
  deleteStudent,
  getStudentById,
  getUniqueFieldMessage,
  updateStudent,
  updateStudentScores,
} from "@/lib/services/students";
import { triggerReadinessRecalculation } from "@/lib/services/readiness";
import { scoreUpdateSchema, studentSchema } from "@/lib/validations/student";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "students:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const student = await getStudentById(id);

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  return NextResponse.json(student);
}

export async function PUT(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canEdit = hasPermission(session.role, "students:edit");
  const canUpdateScores = hasPermission(session.role, "students:update_scores");

  if (!canEdit && !canUpdateScores) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getStudentById(id);
  if (!existing) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  try {
    const body = await request.json();

    if (!canEdit && canUpdateScores) {
      const parsed = scoreUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.errors[0]?.message ?? "Invalid input" },
          { status: 400 }
        );
      }
      const student = await updateStudentScores(
        id,
        parsed.data.technicalScore,
        parsed.data.communicationScore
      );

      await logAudit({
        actorUserId: session.id,
        actorRole: session.role,
        action: "SCORE_UPDATED",
        entityType: "Student",
        entityId: student.id,
        description: `Updated scores for ${student.fullName}: technical ${parsed.data.technicalScore}, communication ${parsed.data.communicationScore}`,
      });

      await triggerReadinessRecalculation(id);

      return NextResponse.json(student);
    }

    const parsed = studentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const student = await updateStudent(id, parsed.data);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "STUDENT_UPDATED",
      entityType: "Student",
      entityId: student.id,
      description: `Updated student ${student.fullName} (${student.rollNumber})`,
    });

    await triggerReadinessRecalculation(id);

    return NextResponse.json(student);
  } catch (error) {
    return NextResponse.json(
      { error: getUniqueFieldMessage(error) },
      { status: 409 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "students:delete")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getStudentById(id);

  if (!existing) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  await deleteStudent(id);

  await logAudit({
    actorUserId: session.id,
    actorRole: session.role,
    action: "STUDENT_DELETED",
    entityType: "Student",
    entityId: id,
    description: `Deleted student ${existing.fullName} (${existing.rollNumber})`,
  });

  return NextResponse.json({ success: true });
}
