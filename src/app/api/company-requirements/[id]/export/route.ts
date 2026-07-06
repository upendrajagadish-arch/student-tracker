import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import {
  exportRequirementMatchesToExcel,
  getRequirementExportFilename,
} from "@/lib/services/company-export";
import { getRequirementById } from "@/lib/services/companies";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "matching:export")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const requirement = await getRequirementById(id);
  if (!requirement) {
    return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
  }

  try {
    const { buffer, meta } = await exportRequirementMatchesToExcel(id);
    const filename = getRequirementExportFilename(
      requirement.companyName,
      requirement.roleTitle
    );

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "MATCHING_EXPORTED",
      entityType: "CompanyRequirement",
      entityId: id,
      description: `Exported ${meta.exported} of ${meta.total} matching rows for ${requirement.roleTitle}`,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Export-Total-Rows": String(meta.total),
        "X-Export-Row-Count": String(meta.exported),
        "X-Export-Truncated": meta.truncated ? "true" : "false",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
