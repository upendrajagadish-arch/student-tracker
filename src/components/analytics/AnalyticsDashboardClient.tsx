"use client";

import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { parseApiErrorMessage } from "@/lib/api-errors";
import { formatScore } from "@/lib/utils";
import type {
  AnalyticsBundle,
  AnalyticsFilterOptions,
} from "@/types/analytics";
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Download,
  FileText,
  Gauge,
  Share2,
  Target,
  Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";

const HrFunnelChart = dynamic(
  () => import("./AnalyticsCharts").then((m) => m.HrFunnelChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const BranchReadinessChart = dynamic(
  () => import("./AnalyticsCharts").then((m) => m.BranchReadinessChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const PlacementOutcomeFunnelChart = dynamic(
  () => import("./AnalyticsCharts").then((m) => m.PlacementOutcomeFunnelChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

interface AnalyticsDashboardClientProps {
  data: AnalyticsBundle;
  filterOptions: AnalyticsFilterOptions;
  basePath: string;
  canExport: boolean;
}

export function AnalyticsDashboardClient({
  data,
  filterOptions,
  basePath,
  canExport,
}: AnalyticsDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${basePath}?${params.toString()}`);
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await fetch(
        `/api/analytics/export?${searchParams.toString()}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(
          parseApiErrorMessage(
            data,
            "Analytics export is available to Admin and TPO only."
          ),
          "error"
        );
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `placementiq-analytics-${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Analytics exported", "success");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-surface-border bg-white p-4">
        <div className="flex flex-wrap gap-3">
          <FilterSelect
            label="Batch"
            value={searchParams.get("batch") ?? ""}
            onChange={(v) => updateFilter("batch", v)}
            options={filterOptions.batches}
          />
          <FilterSelect
            label="Branch"
            value={searchParams.get("branch") ?? ""}
            onChange={(v) => updateFilter("branch", v)}
            options={filterOptions.branches}
          />
          <FilterSelect
            label="Company"
            value={searchParams.get("companyId") ?? ""}
            onChange={(v) => updateFilter("companyId", v)}
            options={filterOptions.companies.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
          />
          <FilterSelect
            label="Requirement"
            value={searchParams.get("requirementId") ?? ""}
            onChange={(v) => updateFilter("requirementId", v)}
            options={filterOptions.requirements.map((r) => ({
              value: r.id,
              label: r.label,
            }))}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              From
            </label>
            <input
              type="date"
              defaultValue={searchParams.get("dateFrom") ?? ""}
              onChange={(e) => updateFilter("dateFrom", e.target.value)}
              className="rounded-lg border border-surface-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              To
            </label>
            <input
              type="date"
              defaultValue={searchParams.get("dateTo") ?? ""}
              onChange={(e) => updateFilter("dateTo", e.target.value)}
              className="rounded-lg border border-surface-border px-3 py-2 text-sm"
            />
          </div>
        </div>
        {canExport && (
          <Button onClick={handleExport} isLoading={isExporting}>
            <Download className="h-4 w-4" />
            Export to Excel
          </Button>
        )}
      </div>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Executive Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Students" value={data.overview.totalStudents} icon={Users} />
          <StatCard title="Placement Ready" value={data.overview.placementReady} icon={Target} />
          <StatCard title="High Risk" value={data.overview.highRiskStudents} icon={AlertTriangle} />
          <StatCard title="Active Requirements" value={data.overview.activeRequirements} icon={Briefcase} />
          <StatCard title="Shared With HR" value={data.overview.sharedWithHr} icon={Share2} />
          <StatCard title="HR Interested" value={data.overview.hrInterested} icon={Share2} />
          <StatCard title="HR Shortlisted" value={data.overview.hrShortlisted} icon={Target} />
          <StatCard
            title="Avg Readiness"
            value={formatScore(data.overview.avgReadinessScore)}
            icon={Gauge}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-surface-border bg-white p-5 shadow-card">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
            HR Funnel
          </h2>
          <p className="mb-4 text-xs text-slate-400">
            Shared → Viewed ({data.hrFunnel.conversionViewedRate}%) → Interested (
            {data.hrFunnel.conversionInterestedRate}%) → Shortlisted (
            {data.hrFunnel.conversionShortlistedRate}%)
          </p>
          <HrFunnelChart hrFunnel={data.hrFunnel} />
        </div>

        <div className="rounded-xl border border-surface-border bg-white p-5 shadow-card">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Branch Readiness
          </h2>
          <BranchReadinessChart branchReadiness={data.branchReadiness} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Placement Outcomes
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Drives"
            value={data.placementOutcomes.totalDrives}
            icon={Briefcase}
          />
          <StatCard
            title="Active Drives"
            value={data.placementOutcomes.activeDrives}
            icon={Briefcase}
          />
          <StatCard
            title="Selections"
            value={data.placementOutcomes.selectionCount}
            icon={Target}
          />
          <StatCard
            title="Offers"
            value={data.placementOutcomes.offerCount}
            icon={Target}
          />
          <StatCard
            title="Joined"
            value={data.placementOutcomes.joinedCount}
            icon={Users}
          />
          <StatCard
            title="Rejections"
            value={data.placementOutcomes.rejectionCount}
            icon={AlertTriangle}
          />
          <StatCard
            title="Avg Package (LPA)"
            value={
              data.placementOutcomes.avgPackageLpa != null
                ? formatScore(data.placementOutcomes.avgPackageLpa)
                : "—"
            }
            icon={Gauge}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-surface-border bg-white p-5 shadow-card lg:col-span-2">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Placement Outcome Funnel
          </h2>
          <p className="mb-4 text-xs text-slate-400">
            Student counts at each stage across filtered placement drives
          </p>
          <PlacementOutcomeFunnelChart funnel={data.placementOutcomes.funnel} />
        </div>
      </section>

      <AnalyticsTable
        title="Drive-wise Conversion"
        headers={["Drive", "Company", "Registered", "Joined", "Conversion %"]}
        rows={
          data.placementOutcomes.driveConversions.length === 0
            ? null
            : data.placementOutcomes.driveConversions.map((d) => [
                d.driveTitle,
                d.companyName,
                d.registered,
                d.joined,
                `${d.conversionRate}%`,
              ])
        }
        emptyMessage="No placement drives yet."
      />

      <AnalyticsTable
        title="Branch-wise Selections"
        headers={["Branch", "Selections"]}
        rows={
          data.placementOutcomes.branchSelections.length === 0
            ? null
            : data.placementOutcomes.branchSelections.map((b) => [
                b.branch,
                b.selectionCount,
              ])
        }
        emptyMessage="No selections recorded yet."
      />

      <AnalyticsTable
        title="Company Requirement Performance"
        headers={[
          "Company",
          "Role",
          "Matched",
          "Strong",
          "Good",
          "Avg",
          "Risk",
          "Not Elig.",
          "Shared",
          "Interested",
          "Shortlisted",
        ]}
        rows={
          data.companyRequirements.length === 0
            ? null
            : data.companyRequirements.map((r) => [
                r.companyName,
                r.roleTitle,
                r.totalMatched,
                r.strongFit,
                r.goodFit,
                r.averageFit,
                r.riskFit,
                r.notEligible,
                r.sharedCount,
                r.hrInterestedCount,
                r.hrShortlistedCount,
              ])
        }
        emptyMessage="No active requirements with match data."
      />

      <AnalyticsTable
        title="Branch Readiness Heatmap"
        headers={[
          "Branch",
          "Students",
          "Avg Readiness",
          "Technical",
          "Communication",
          "Resume OK",
          "Verified Skills",
          "High Risk",
        ]}
        heatmapColumn={2}
        rows={
          data.branchReadiness.length === 0
            ? null
            : data.branchReadiness.map((b) => [
                b.branch,
                b.totalStudents,
                b.avgReadiness,
                b.avgTechnical,
                b.avgCommunication,
                b.resumeApprovedCount,
                b.avgVerifiedSkills,
                b.highRiskCount,
              ])
        }
        emptyMessage="No students to analyze."
      />

      <AnalyticsTable
        title="Top Missing Skills"
        headers={["Skill", "Missing Count", "Requirements", "Top Branches"]}
        rows={
          data.skillGaps.length === 0
            ? null
            : data.skillGaps.map((s) => [
                s.skill,
                s.missingCount,
                s.affectedRequirements,
                s.topBranches.join(", ") || "—",
              ])
        }
        emptyMessage="Run company matching on active requirements to surface skill gaps."
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <MetricPanel title="Resume Analytics" icon={FileText}>
          <MetricRow label="Uploaded" value={data.resume.uploadedCount} />
          <MetricRow label="Approved" value={data.resume.approvedCount} />
          <MetricRow label="Needs Improvement" value={data.resume.needsImprovementCount} />
          <MetricRow label="Avg Score" value={formatScore(data.resume.avgResumeScore)} />
          <MetricRow label="ATS Friendly" value={data.resume.atsFriendlyCount} />
          <MetricRow label="Missing LinkedIn" value={data.resume.missingLinkedInCount} />
          <MetricRow label="Missing GitHub" value={data.resume.missingGitHubCount} />
        </MetricPanel>

        <MetricPanel title="Tech Stack Analytics" icon={BarChart3}>
          <MetricRow label="Students w/ Skills" value={data.techStack.studentsWithTechStack} />
          <MetricRow
            label="Avg Verified / Student"
            value={data.techStack.avgVerifiedSkillsPerStudent}
          />
          <MetricRow label="Unverified Skills" value={data.techStack.unverifiedSkillCount} />
          <div className="mt-3 border-t border-surface-border pt-3">
            <p className="mb-2 text-xs font-medium uppercase text-slate-500">
              Top Verified Skills
            </p>
            {data.techStack.topVerifiedSkills.slice(0, 5).map((s) => (
              <div key={s.skill} className="flex justify-between text-sm">
                <span className="text-slate-600">{s.skill}</span>
                <span className="font-medium">{s.count}</span>
              </div>
            ))}
          </div>
        </MetricPanel>

        <MetricPanel title="Passport Analytics" icon={Gauge}>
          <MetricRow label="Generated" value={data.passport.passportsGenerated} />
          <MetricRow label="HR Views" value={data.passport.hrPassportViews} />
          <MetricRow label="Internal Views" value={data.passport.internalPassportViews} />
          <MetricRow label="Print / PDF" value={data.passport.printDownloadActions} />
        </MetricPanel>
      </section>
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-64 animate-pulse rounded-lg bg-slate-100" />;
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[] | string[];
}) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      <Select value={value} onChange={(e) => onChange(e.target.value)} className="min-w-[140px]">
        <option value="">All</option>
        {normalized.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

function AnalyticsTable({
  title,
  headers,
  rows,
  emptyMessage,
  heatmapColumn,
}: {
  title: string;
  headers: string[];
  rows: (string | number)[][] | null;
  emptyMessage: string;
  heatmapColumn?: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-surface-border bg-white shadow-card">
      <div className="border-b border-surface-border px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h2>
      </div>
      {!rows || rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-slate-50/80">
                {headers.map((h) => (
                  <th key={h} className="px-4 py-3 font-medium text-slate-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className="px-4 py-3 text-slate-700"
                      style={
                        heatmapColumn === j && typeof cell === "number"
                          ? {
                              backgroundColor: `rgba(79, 70, 229, ${Math.min(0.35, (cell as number) / 100 * 0.35)})`,
                            }
                          : undefined
                      }
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MetricPanel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Gauge;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-600" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h2>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
