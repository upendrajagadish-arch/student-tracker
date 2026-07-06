import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { ExportLimitExceededError } from "@/lib/export-limits";
import { canExportDrives } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { exportDrivePipelineToExcel } from "@/lib/services/placement-drive-export";
import { getPlacementDriveById } from "@/lib/services/placement-drives";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canExportDrives(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  const { id } = await params;
  const drive = await getPlacementDriveById(id);
  if (!drive) return apiError("NOT_FOUND", "Placement drive not found.", 404);

  try {
    const { buffer, meta } = await exportDrivePipelineToExcel(id);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "DRIVE_PIPELINE_EXPORTED",
      entityType: "PlacementDrive",
      entityId: id,
      description: `Exported pipeline for "${drive.driveTitle}"`,
    });

    const slug = drive.driveTitle.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 40);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="drive-pipeline-${slug}.xlsx"`,
        "X-Export-Total-Rows": String(meta.total),
        "X-Export-Row-Count": String(meta.exported),
        "X-Export-Truncated": meta.truncated ? "true" : "false",
      },
    });
  } catch (error) {
    if (error instanceof ExportLimitExceededError) {
      return apiError("BAD_REQUEST", error.message, 413);
    }
    return apiErrorFromUnknown(error, {
      route: "/api/placement-drives/[id]/export",
      action: "export_drive",
    });
  }
}
