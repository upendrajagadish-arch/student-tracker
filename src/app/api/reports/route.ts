import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canViewReports } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { getReport, parseReportFilters } from "@/lib/services/reports";
import type { ReportType } from "@/types/reports";

const VALID_TYPES: ReportType[] = [
  "DRIVE_SUMMARY",
  "COMPANY_PLACEMENT",
  "BRANCH_PLACEMENT",
  "BATCH_READINESS",
  "STUDENT_PLACEMENT_HISTORY",
  "RESUME_READINESS",
  "SKILL_GAP",
  "HR_SHARING",
  "FINAL_PLACEMENT_OUTCOME",
  "MANAGEMENT_SUMMARY",
];

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !canViewReports(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type") as ReportType | null;
    if (!type || !VALID_TYPES.includes(type)) {
      return apiError("BAD_REQUEST", "Valid report type is required.", 400);
    }

    const filters = parseReportFilters(
      Object.fromEntries(url.searchParams.entries())
    );
    const report = await getReport(type, filters);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "REPORT_VIEWED",
      entityType: "Report",
      entityId: type,
      description: `Viewed ${report.title}`,
    });

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/reports",
      action: "get_report",
      fallbackMessage: "Could not generate report.",
    });
  }
}
