import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canManageDrives } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { addMatchedStudentsToDrive } from "@/lib/services/placement-drives";
import { addFromMatchSchema } from "@/lib/validations/placement-drive";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canManageDrives(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = addFromMatchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message ?? "Invalid input",
        400
      );
    }

    const result = await addMatchedStudentsToDrive(
      id,
      parsed.data.requirementId,
      parsed.data.matchFilter ?? "STRONG_FIT",
      parsed.data.studentIds,
      session.id
    );

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "STUDENT_ADDED_TO_DRIVE",
      entityType: "PlacementDrive",
      entityId: id,
      description: `Added ${result.added} matched students (${result.skipped} skipped)`,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/placement-drives/[id]/add-matches",
      action: "add_matches",
    });
  }
}
