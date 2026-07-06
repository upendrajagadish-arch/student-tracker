import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import {
  getHrSharedStudentDetail,
  updateHrDecision,
} from "@/lib/services/student-sharing";
import { hrDecisionSchema } from "@/lib/validations/sharing";

interface RouteParams {
  params: Promise<{ shareId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "talent:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { shareId } = await params;
  const detail = await getHrSharedStudentDetail(shareId, session.id);

  if (!detail) {
    return NextResponse.json({ error: "Not found or access denied" }, { status: 404 });
  }

  await logAudit({
    actorUserId: session.id,
    actorRole: session.role,
    action: "SHARE_VIEWED_BY_HR",
    entityType: "SharedStudentProfile",
    entityId: shareId,
    description: `HR viewed shared profile for ${detail.student.fullName}`,
  });

  return NextResponse.json(detail);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "talent:update")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { shareId } = await params;

  try {
    const body = await request.json();
    const parsed = hrDecisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    await updateHrDecision(
      shareId,
      session.id,
      parsed.data.hrDecision,
      parsed.data.hrComments
    );

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "HR_DECISION_UPDATED",
      entityType: "SharedStudentProfile",
      entityId: shareId,
      description: `HR decision updated to ${parsed.data.hrDecision}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
