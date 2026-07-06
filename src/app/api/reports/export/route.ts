import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canExportReports } from "@/lib/permissions";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit-middleware";
import { logAudit } from "@/lib/services/audit";
import {
  exportReportToExcel,
  reportExportFilename,
} from "@/lib/services/report-export";
import {
  formatFilterLabelsAsText,
  getReport,
  getReportFilterLabels,
  parseReportFilters,
} from "@/lib/services/reports";
import { getPublicBrandingSettings } from "@/lib/services/app-settings";
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
  if (!session || !canExportReports(session.role)) {
    return apiError(
      "UNAUTHORIZED",
      unauthorizedMessage(session?.role),
      401
    );
  }

  const limited = await withRateLimit(
    request,
    "report_export",
    RATE_LIMITS.analyticsExport,
    session.id
  );
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type") as ReportType | null;
    if (!type || !VALID_TYPES.includes(type)) {
      return apiError("BAD_REQUEST", "Valid report type is required.", 400);
    }

    const filters = parseReportFilters(
      Object.fromEntries(url.searchParams.entries())
    );
    const [report, branding, filterLabels] = await Promise.all([
      getReport(type, filters),
      getPublicBrandingSettings(),
      getReportFilterLabels(filters),
    ]);
    const buffer = await exportReportToExcel(report, {
      branding,
      filtersApplied: formatFilterLabelsAsText(filterLabels),
    });

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "REPORT_EXPORTED",
      entityType: "Report",
      entityId: type,
      description: `Exported ${report.title} to Excel`,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${reportExportFilename(report)}"`,
      },
    });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/reports/export",
      action: "export_report",
      fallbackMessage: "Could not export report.",
    });
  }
}
