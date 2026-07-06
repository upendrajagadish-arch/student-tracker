import { AnalyticsPreviewSection } from "@/components/analytics/AnalyticsPreviewSection";
import { DashboardStatsGrid } from "@/components/students/DashboardStatsGrid";
import { PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { PremiumSection } from "@/components/premium/PremiumSection";
import { SpotlightCard } from "@/components/premium/SpotlightCard";
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
      <PremiumPageHeader
        eyebrow="Executive overview"
        title={title}
        description={`${description} · ${branding.placementCellName}, ${branding.institutionName}`}
      />
      <DashboardStatsGrid stats={stats} />
      {preview && (
        <AnalyticsPreviewSection preview={preview} analyticsPath={analyticsPath} />
      )}
      <PremiumSection title="System overview">
        <SpotlightCard gradientBorder className="overflow-hidden p-0">
          <div className="h-1 bg-gradient-to-r from-brand-500/40 via-luxury-cyan/30 to-luxury-gold/30" />
          <div className="p-6">
            <p className="text-sm leading-relaxed text-slate-600">
              Live metrics from student records, readiness engine, company matching,
              and HR sharing. Open Analytics for funnel and skill-gap insights.
            </p>
          </div>
        </SpotlightCard>
      </PremiumSection>
    </div>
  );
}
