import { ReportPrintActions } from "@/components/reports/print/ReportPrintActions";
import { ReportPrintLayout } from "@/components/reports/print/ReportPrintLayout";
import { canViewReports } from "@/lib/permissions";
import { getRolePrefix } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { getPublicBrandingSettings } from "@/lib/services/app-settings";
import {
  getReportFilterLabels,
  getReportForPrint,
  parsePrintReportParams,
} from "@/lib/services/reports";
import { REPORT_TYPES } from "@/types/reports";
import type { ReportType } from "@/types/reports";
import type { UserRole } from "@/types";
import { notFound } from "next/navigation";

const PRINTABLE_TYPES = REPORT_TYPES.map((r) => r.type);

export async function ReportsPrintPageContent({
  role,
  userId,
  searchParams,
}: {
  role: UserRole;
  userId: string;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!canViewReports(role)) notFound();
  if (role === "HR") notFound();

  const params = await searchParams;
  const { type, filters } = parsePrintReportParams(params);

  if (!type || !PRINTABLE_TYPES.includes(type)) {
    notFound();
  }

  if (
    type === "DRIVE_SUMMARY" &&
    !filters.driveId
  ) {
    notFound();
  }

  const [report, filterLabels, branding] = await Promise.all([
    getReportForPrint(type, filters),
    getReportFilterLabels(filters),
    getPublicBrandingSettings(),
  ]);

  await logAudit({
    actorUserId: userId,
    actorRole: role,
    action: "REPORT_PRINT_VIEWED",
    entityType: "Report",
    entityId: type,
    description: `Opened print view for ${report.title}`,
  });

  const reportsBasePath = `${getRolePrefix(role)}/reports`;

  return (
    <ReportPrintLayout
      report={report}
      filterLabels={filterLabels}
      branding={branding}
      actions={
        <ReportPrintActions
          reportsBasePath={reportsBasePath}
          reportType={type}
          canPrint
        />
      }
    />
  );
}

export function buildPrintReportUrl(
  basePath: string,
  type: ReportType,
  params: URLSearchParams
): string {
  const printParams = new URLSearchParams();
  printParams.set("reportType", type);

  const keys = [
    "branch",
    "batch",
    "companyId",
    "driveId",
    "requirementId",
    "finalOutcome",
    "dateFrom",
    "dateTo",
  ] as const;

  for (const key of keys) {
    const value = params.get(key);
    if (value) {
      if (key === "dateFrom") printParams.set("fromDate", value);
      else if (key === "dateTo") printParams.set("toDate", value);
      else printParams.set(key, value);
    }
  }

  return `${basePath}/print?${printParams.toString()}`;
}
