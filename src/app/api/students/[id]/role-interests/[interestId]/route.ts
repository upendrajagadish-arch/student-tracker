import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import {
  removeRoleInterest,
  updateRoleInterest,
} from "@/lib/services/tech-stack";
import { roleInterestSchema } from "@/lib/validations/tech-stack";
import { triggerReadinessRecalculation } from "@/lib/services/readiness";

interface RouteParams {
  params: Promise<{ id: string; interestId: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "techstack:manage_skills")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { interestId, id: studentId } = await params;

  try {
    const body = await request.json();
    const parsed = roleInterestSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const interest = await updateRoleInterest(interestId, parsed.data);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "ROLE_INTEREST_UPDATED",
      entityType: "StudentRoleInterest",
      entityId: interest.id,
      description: `Updated role interest ${interest.roleName}`,
    });

    await triggerReadinessRecalculation(studentId);

    return NextResponse.json(interest);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "techstack:delete")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { interestId, id: studentId } = await params;

  await removeRoleInterest(interestId);

  await logAudit({
    actorUserId: session.id,
    actorRole: session.role,
    action: "ROLE_INTEREST_REMOVED",
    entityType: "StudentRoleInterest",
    entityId: interestId,
    description: "Removed role interest from student",
  });

  await triggerReadinessRecalculation(studentId);

  return NextResponse.json({ success: true });
}
