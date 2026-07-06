import { ReportsPageClient } from "@/components/reports/ReportsPageClient";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  canExportReports,
  canViewReports,
  getRolePrefix,
} from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import {
  getReport,
  getReportFilterOptions,
  parseReportFilters,
} from "@/lib/services/reports";
import type { ReportType } from "@/types/reports";
import type { UserRole } from "@/types";
import { notFound } from "next/navigation";

const DEFAULT_TYPE: ReportType = "FINAL_PLACEMENT_OUTCOME";

export async function ReportsPageContent({
  role,
  userId,
  searchParams,
}: {
  role: UserRole;
  userId: string;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!canViewReports(role)) notFound();

  const params = await searchParams;
  const type = (params.type as ReportType) || DEFAULT_TYPE;
  const filters = parseReportFilters(params);

  const [report, filterOptions] = await Promise.all([
    getReport(type, filters),
    getReportFilterOptions(),
  ]);

  await logAudit({
    actorUserId: userId,
    actorRole: role,
    action: "REPORT_VIEWED",
    entityType: "Report",
    entityId: type,
    description: `Viewed ${report.title}`,
  });

  const basePath = `${getRolePrefix(role)}/reports`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reporting suite"
        title="Reports"
        description="Professional placement reports for management, departments, and company reviews."
      />
      <ReportsPageClient
        initialReport={report}
        filterOptions={filterOptions}
        basePath={basePath}
        selectedType={type}
        canExport={canExportReports(role)}
      />
    </div>
  );
}
