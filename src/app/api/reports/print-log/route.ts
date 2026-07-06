import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canViewReports } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { REPORT_TYPE_LABELS } from "@/types/reports";
import type { ReportType } from "@/types/reports";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !canViewReports(session.role) || session.role === "HR") {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  try {
    const body = await request.json();
    const reportType = body.reportType as ReportType | undefined;
    if (!reportType || !REPORT_TYPE_LABELS[reportType]) {
      return apiError("BAD_REQUEST", "Valid report type is required.", 400);
    }

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "REPORT_PRINT_TRIGGERED",
      entityType: "Report",
      entityId: reportType,
      description: `Print / Save as PDF for ${REPORT_TYPE_LABELS[reportType]}`,
    });

    return NextResponse.json({ success: true });
  } catch {
    return apiError("INTERNAL_ERROR", "Could not log print action.", 500);
  }
}
