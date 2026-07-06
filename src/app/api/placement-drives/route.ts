import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canManageDrives, canViewDrives } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import {
  createPlacementDrive,
  getPlacementDriveList,
} from "@/lib/services/placement-drives";
import { placementDriveSchema } from "@/lib/validations/placement-drive";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !canViewDrives(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  const url = new URL(request.url);
  const result = await getPlacementDriveList({
    search: url.searchParams.get("search") ?? undefined,
    status: (url.searchParams.get("status") as never) ?? undefined,
    companyId: url.searchParams.get("companyId") ?? undefined,
    page: Number(url.searchParams.get("page") ?? 1),
    pageSize: Number(url.searchParams.get("pageSize") ?? 12),
  });

  return NextResponse.json({ success: true, ...result });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !canManageDrives(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  try {
    const body = await request.json();
    const parsed = placementDriveSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message ?? "Invalid input",
        400
      );
    }

    const drive = await createPlacementDrive({
      ...parsed.data,
      driveDate: parsed.data.driveDate
        ? new Date(parsed.data.driveDate)
        : null,
      createdByUserId: session.id,
    });

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "PLACEMENT_DRIVE_CREATED",
      entityType: "PlacementDrive",
      entityId: drive.id,
      description: `Created placement drive "${drive.driveTitle}" for ${drive.companyName}`,
    });

    return NextResponse.json({ success: true, data: drive }, { status: 201 });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/placement-drives",
      action: "create_drive",
      fallbackMessage: "Could not create placement drive.",
    });
  }
}
