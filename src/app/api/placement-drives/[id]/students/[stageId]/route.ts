import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import {
  canManageDrives,
  canUpdateDriveStage,
  canUpdateDriveTechnical,
} from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import {
  removeStudentFromDrive,
  updateStudentStage,
} from "@/lib/services/placement-drives";
import { stageActionSchema } from "@/lib/validations/placement-drive";
import type { StageAction } from "@/types/placement-drive";

interface RouteParams {
  params: Promise<{ id: string; stageId: string }>;
}

function canPerformAction(role: string, action: StageAction): boolean {
  if (canUpdateDriveStage(role as never)) return true;
  if (
    canUpdateDriveTechnical(role as never) &&
    (action === "MARK_TECHNICAL_CLEARED" || action === "MARK_TECHNICAL_FAILED")
  ) {
    return true;
  }
  return false;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getSession();
  const { id, stageId } = await params;

  try {
    const body = await request.json();
    const parsed = stageActionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message ?? "Invalid input",
        400
      );
    }

    if (!session || !canPerformAction(session.role, parsed.data.action)) {
      return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
    }

    await updateStudentStage(stageId, parsed.data.action, session.id, {
      rejectionReason: parsed.data.rejectionReason,
      packageLpa: parsed.data.packageLpa,
      offerLocation: parsed.data.offerLocation,
      notes: parsed.data.notes,
    });

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "STUDENT_STAGE_UPDATED",
      entityType: "StudentPlacementStage",
      entityId: stageId,
      description: `Stage updated to ${parsed.data.action} on drive ${id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/placement-drives/[id]/students/[stageId]",
      action: "update_stage",
    });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canManageDrives(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  const { id, stageId } = await params;

  try {
    await removeStudentFromDrive(stageId);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "STUDENT_REMOVED_FROM_DRIVE",
      entityType: "StudentPlacementStage",
      entityId: stageId,
      description: `Student removed from drive ${id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/placement-drives/[id]/students/[stageId]",
      action: "remove_student",
    });
  }
}
