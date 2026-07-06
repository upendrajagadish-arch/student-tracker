import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canManageDrives } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { createDriveFromRequirement } from "@/lib/services/placement-drives";
import { createFromRequirementSchema } from "@/lib/validations/placement-drive";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !canManageDrives(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  try {
    const body = await request.json();
    const parsed = createFromRequirementSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message ?? "Invalid input",
        400
      );
    }

    const drive = await createDriveFromRequirement(
      parsed.data.requirementId,
      session.id,
      {
        driveTitle: parsed.data.driveTitle,
        driveDate: parsed.data.driveDate
          ? new Date(parsed.data.driveDate)
          : null,
        status: "UPCOMING",
      }
    );

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "PLACEMENT_DRIVE_CREATED",
      entityType: "PlacementDrive",
      entityId: drive.id,
      description: `Created drive from requirement for "${drive.driveTitle}"`,
    });

    return NextResponse.json({ success: true, data: drive }, { status: 201 });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/placement-drives/from-requirement",
      action: "create_from_requirement",
    });
  }
}
