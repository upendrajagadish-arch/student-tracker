import { AnalyticsDashboardClient } from "@/components/analytics/AnalyticsDashboardClient";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  canExportAnalytics,
  canViewAnalytics,
  getRolePrefix,
} from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import {
  getAnalyticsBundle,
  getAnalyticsFilterOptions,
  parseAnalyticsFilters,
} from "@/lib/services/analytics";
import type { UserRole } from "@/types";
import { notFound } from "next/navigation";

export async function AnalyticsPageContent({
  role,
  userId,
  searchParams,
}: {
  role: UserRole;
  userId: string;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!canViewAnalytics(role)) notFound();

  const params = await searchParams;
  const filters = parseAnalyticsFilters(params);

  const [data, filterOptions] = await Promise.all([
    getAnalyticsBundle(filters),
    getAnalyticsFilterOptions(),
  ]);

  await logAudit({
    actorUserId: userId,
    actorRole: role,
    action: "ANALYTICS_VIEWED",
    entityType: "Analytics",
    description: "Viewed placement analytics dashboard",
  });

  const basePath = `${getRolePrefix(role)}/analytics`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Placement intelligence — readiness, HR engagement, matching, and skill gaps."
      />
      <AnalyticsDashboardClient
        data={data}
        filterOptions={filterOptions}
        basePath={basePath}
        canExport={canExportAnalytics(role)}
      />
    </div>
  );
}
