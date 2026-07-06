import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ExportLimitExceededError } from "@/lib/export-limits";
import { apiError } from "@/lib/api-response";
import { hasPermission } from "@/lib/permissions";
import {
  exportStudentsToExcel,
  getExportFilename,
} from "@/lib/services/export";
import { logAudit } from "@/lib/services/audit";
import type { PlacementStatus } from "@/types";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "students:export")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const { buffer, meta } = await exportStudentsToExcel({
      search: searchParams.get("search") ?? undefined,
      branch: searchParams.get("branch") ?? undefined,
      batch: searchParams.get("batch") ?? undefined,
      placementStatus:
        (searchParams.get("placementStatus") as PlacementStatus) ?? undefined,
    });

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "STUDENTS_EXPORTED",
      entityType: "Student",
      description: `Exported ${meta.exportedRows} students to Excel`,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${getExportFilename()}"`,
        "X-Export-Total-Rows": String(meta.totalRows),
        "X-Export-Row-Count": String(meta.exportedRows),
        "X-Export-Truncated": meta.truncated ? "true" : "false",
      },
    });
  } catch (error) {
    if (error instanceof ExportLimitExceededError) {
      return apiError("BAD_REQUEST", error.message, 413);
    }
    throw error;
  }
}
