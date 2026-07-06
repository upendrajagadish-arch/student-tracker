import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canManageDrives, canViewDrives } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import {
  getPlacementDriveById,
  updatePlacementDrive,
} from "@/lib/services/placement-drives";
import { placementDriveSchema } from "@/lib/validations/placement-drive";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canViewDrives(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  const { id } = await params;
  const drive = await getPlacementDriveById(id);
  if (!drive) return apiError("NOT_FOUND", "Placement drive not found.", 404);

  return NextResponse.json({ success: true, data: drive });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canManageDrives(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = placementDriveSchema.partial().safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message ?? "Invalid input",
        400
      );
    }

    const drive = await updatePlacementDrive(id, {
      ...parsed.data,
      driveDate:
        parsed.data.driveDate === undefined
          ? undefined
          : parsed.data.driveDate
            ? new Date(parsed.data.driveDate)
            : null,
    });

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "PLACEMENT_DRIVE_UPDATED",
      entityType: "PlacementDrive",
      entityId: id,
      description: `Updated placement drive "${drive.driveTitle}"`,
    });

    return NextResponse.json({ success: true, data: drive });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/placement-drives/[id]",
      action: "update_drive",
      fallbackMessage: "Could not update placement drive.",
    });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canManageDrives(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const status = body.status as string | undefined;
    if (!status) {
      return apiError("BAD_REQUEST", "Status is required.", 400);
    }

    const drive = await updatePlacementDrive(id, { status });

    const action =
      status === "CANCELLED" || status === "ARCHIVED"
        ? "PLACEMENT_DRIVE_ARCHIVED"
        : "PLACEMENT_DRIVE_UPDATED";

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action,
      entityType: "PlacementDrive",
      entityId: id,
      description: `Drive "${drive.driveTitle}" status set to ${status}`,
    });

    return NextResponse.json({ success: true, data: drive });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/placement-drives/[id]",
      action: "patch_drive_status",
    });
  }
}
