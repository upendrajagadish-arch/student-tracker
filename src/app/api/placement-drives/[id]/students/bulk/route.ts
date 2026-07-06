import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canUpdateDriveStage } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { bulkUpdateStudentStages } from "@/lib/services/placement-drives";
import { bulkStageActionSchema } from "@/lib/validations/placement-drive";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canUpdateDriveStage(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = bulkStageActionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message ?? "Invalid input",
        400
      );
    }

    const count = await bulkUpdateStudentStages(
      parsed.data.stageIds,
      parsed.data.action,
      session.id,
      {
        rejectionReason: parsed.data.rejectionReason,
        packageLpa: parsed.data.packageLpa,
        offerLocation: parsed.data.offerLocation,
      }
    );

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "BULK_STAGE_UPDATE",
      entityType: "PlacementDrive",
      entityId: id,
      description: `Bulk ${parsed.data.action} on ${count} students`,
    });

    return NextResponse.json({ success: true, count });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/placement-drives/[id]/students/bulk",
      action: "bulk_stage",
    });
  }
}
