import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  createStudent,
  getDistinctBatches,
  getDistinctBranches,
  getStudents,
  getUniqueFieldMessage,
} from "@/lib/services/students";
import { logAudit } from "@/lib/services/audit";
import { triggerReadinessRecalculation } from "@/lib/services/readiness";
import { studentSchema } from "@/lib/validations/student";
import type { PlacementStatus } from "@/types";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "students:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const result = await getStudents({
    search: searchParams.get("search") ?? undefined,
    branch: searchParams.get("branch") ?? undefined,
    batch: searchParams.get("batch") ?? undefined,
    placementStatus:
      (searchParams.get("placementStatus") as PlacementStatus) ?? undefined,
    page: Number(searchParams.get("page")) || 1,
    pageSize: Number(searchParams.get("pageSize")) || 10,
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "students:create")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = studentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const student = await createStudent(parsed.data);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "STUDENT_CREATED",
      entityType: "Student",
      entityId: student.id,
      description: `Created student ${student.fullName} (${student.rollNumber})`,
    });

    await triggerReadinessRecalculation(student.id);

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: getUniqueFieldMessage(error) },
      { status: 409 }
    );
  }
}

export async function OPTIONS() {
  const [branches, batches] = await Promise.all([
    getDistinctBranches(),
    getDistinctBatches(),
  ]);
  return NextResponse.json({ branches, batches });
}
