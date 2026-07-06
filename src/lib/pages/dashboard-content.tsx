import { AnalyticsPreviewSection } from "@/components/analytics/AnalyticsPreviewSection";
import { DashboardStatsGrid } from "@/components/students/DashboardStatsGrid";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { canViewAnalytics, getRolePrefix } from "@/lib/permissions";
import { getAnalyticsPreview } from "@/lib/services/analytics";
import { getPublicBrandingSettings } from "@/lib/services/app-settings";
import { getDashboardStats } from "@/lib/services/students";
import type { UserRole } from "@/types";

export async function DashboardPageContent({
  title,
  description,
  role,
}: {
  title: string;
  description: string;
  role?: UserRole;
}) {
  const stats = await getDashboardStats();
  const branding = await getPublicBrandingSettings();
  const showAnalytics =
    role &&
    (role === "SUPER_ADMIN" || role === "TPO_ADMIN") &&
    canViewAnalytics(role);

  const preview = showAnalytics ? await getAnalyticsPreview() : null;
  const analyticsPath = role ? `${getRolePrefix(role)}/analytics` : "";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Executive overview"
        title={title}
        description={`${description} · ${branding.placementCellName}, ${branding.institutionName}`}
      />
      <DashboardStatsGrid stats={stats} />
      {preview && (
        <AnalyticsPreviewSection preview={preview} analyticsPath={analyticsPath} />
      )}
      <Card className="premium-hover-lift overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-brand-500/40 via-luxury-cyan/30 to-luxury-gold/30" />
        <CardHeader>
          <CardTitle>System overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-slate-600">
            Live metrics from student records, readiness engine, company matching,
            and HR sharing. Open Analytics for funnel and skill-gap insights.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
