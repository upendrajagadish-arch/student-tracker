"use client";

import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassPanel } from "@/components/ui/premium/GlassPanel";
import { PremiumTableWrapper } from "@/components/ui/premium/PremiumTableWrapper";
import { SpotlightCard } from "@/components/ui/premium/SpotlightCard";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { parseApiErrorMessage } from "@/lib/api-errors";
import type {
  ReportFilterOptions,
  ReportResult,
  ReportType,
  ReportTypeMeta,
} from "@/types/reports";
import { REPORT_TYPES } from "@/types/reports";
import {
  BarChart3,
  Briefcase,
  Building2,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Printer,
  Share2,
  Target,
  Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

const REPORT_ICONS: Record<ReportType, typeof BarChart3> = {
  DRIVE_SUMMARY: Target,
  COMPANY_PLACEMENT: Building2,
  BRANCH_PLACEMENT: GraduationCap,
  BATCH_READINESS: BarChart3,
  STUDENT_PLACEMENT_HISTORY: Users,
  RESUME_READINESS: FileSpreadsheet,
  SKILL_GAP: Layers,
  HR_SHARING: Share2,
  FINAL_PLACEMENT_OUTCOME: Briefcase,
  MANAGEMENT_SUMMARY: BarChart3,
};

interface ReportsPageClientProps {
  initialReport: ReportResult | null;
  filterOptions: ReportFilterOptions;
  basePath: string;
  selectedType: ReportType;
  canExport: boolean;
}

export function ReportsPageClient({
  initialReport,
  filterOptions,
  basePath,
  selectedType,
  canExport,
}: ReportsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [report, setReport] = useState<ReportResult | null>(initialReport);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentMeta = REPORT_TYPES.find((r) => r.type === selectedType)!;

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`${basePath}?${params.toString()}`);
  }

  const refreshReport = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/reports?${searchParams.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast(parseApiErrorMessage(data, "Could not load report"), "error");
        return;
      }
      setReport(data.data);
    } finally {
      setIsRefreshing(false);
    }
  }, [searchParams, toast]);

  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/reports/export?${searchParams.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(parseApiErrorMessage(data, "Export failed"), "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        "report.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast("Report exported", "success");
    } finally {
      setIsExporting(false);
    }
  }

  function openPrintView() {
    const printParams = new URLSearchParams();
    printParams.set("reportType", selectedType);
    for (const key of [
      "branch",
      "batch",
      "companyId",
      "driveId",
      "requirementId",
      "finalOutcome",
      "dateFrom",
      "dateTo",
    ] as const) {
      const value = searchParams.get(key);
      if (!value) continue;
      if (key === "dateFrom") printParams.set("fromDate", value);
      else if (key === "dateTo") printParams.set("toDate", value);
      else printParams.set(key, value);
    }
    window.open(`${basePath}/print?${printParams.toString()}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {REPORT_TYPES.map((meta) => (
          <ReportTypeCard
            key={meta.type}
            meta={meta}
            active={selectedType === meta.type}
            onSelect={() => updateParams({ type: meta.type })}
          />
        ))}
      </div>

      <GlassPanel className="p-4 print:hidden">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Filters & export</h2>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={refreshReport}
              isLoading={isRefreshing}
            >
              Refresh
            </Button>
            {canExport && (
              <Button size="sm" onClick={handleExport} isLoading={isExporting}>
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={openPrintView}>
              <Printer className="h-4 w-4" />
              Print / Save as PDF
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <FilterSelect
            label="Branch"
            value={searchParams.get("branch") ?? ""}
            options={filterOptions.branches}
            onChange={(v) => updateParams({ branch: v })}
          />
          <FilterSelect
            label="Batch"
            value={searchParams.get("batch") ?? ""}
            options={filterOptions.batches}
            onChange={(v) => updateParams({ batch: v })}
          />
          <FilterSelect
            label="Company"
            value={searchParams.get("companyId") ?? ""}
            options={filterOptions.companies.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
            onChange={(v) => updateParams({ companyId: v })}
          />
          <FilterSelect
            label="Placement Drive"
            value={searchParams.get("driveId") ?? ""}
            options={filterOptions.drives.map((d) => ({
              value: d.id,
              label: d.label,
            }))}
            onChange={(v) => updateParams({ driveId: v })}
          />
          <FilterSelect
            label="Requirement"
            value={searchParams.get("requirementId") ?? ""}
            options={filterOptions.requirements.map((r) => ({
              value: r.id,
              label: r.label,
            }))}
            onChange={(v) => updateParams({ requirementId: v })}
          />
          <FilterSelect
            label="Final Outcome"
            value={searchParams.get("finalOutcome") ?? ""}
            options={filterOptions.finalOutcomes.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            onChange={(v) => updateParams({ finalOutcome: v })}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              From
            </label>
            <input
              type="date"
              defaultValue={searchParams.get("dateFrom") ?? ""}
              onChange={(e) => updateParams({ dateFrom: e.target.value })}
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
              onChange={(e) => updateParams({ dateTo: e.target.value })}
              className="rounded-lg border border-surface-border px-3 py-2 text-sm"
            />
          </div>
        </div>
        {currentMeta.requiresDrive && !searchParams.get("driveId") && (
          <p className="mt-3 text-sm text-amber-700">
            Select a placement drive to generate the {currentMeta.title} report.
          </p>
        )}
      </GlassPanel>

      <div id="report-preview" className="space-y-6 print:space-y-4">
        <SpotlightCard disableSpotlight hoverLift className="p-5 print:shadow-none print:ring-0">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {report?.title ?? currentMeta.title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {report?.description ?? currentMeta.description}
              </p>
              {report?.generatedAt && (
                <p className="mt-1 text-xs text-slate-400 print:block">
                  Generated {new Date(report.generatedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {report?.warnings?.map((w) => (
            <div
              key={w}
              className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              {w}
            </div>
          ))}

          {report?.rowCap && report.truncated && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Displaying first {report.rowCap.toLocaleString()} rows per section.
              Narrow filters before export for smaller files.
            </div>
          )}

          {!report || (report.summary.length === 0 && report.sections.every((s) => s.rows.length === 0)) ? (
            <EmptyState
              icon={FileSpreadsheet}
              title="No report data"
              description="Adjust filters or select a different report type."
            />
          ) : (
            <>
              {report.summary.length > 0 && (
                <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {report.summary.slice(0, 8).map((item) => (
                    <StatCard
                      key={item.label}
                      title={item.label}
                      value={String(item.value)}
                      icon={Briefcase}
                      compact
                    />
                  ))}
                </div>
              )}

              {report.sections.map((section) => (
                <div key={section.title} className="mb-8 last:mb-0">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    {section.title}
                  </h3>
                  {section.rows.length === 0 ? (
                    <p className="text-sm text-slate-400">No rows for this section.</p>
                  ) : (
                    <PremiumTableWrapper>
                      <table className="premium-table w-full min-w-[640px] text-left text-sm">
                        <thead>
                          <tr>
                            {section.headers.map((h) => (
                              <th key={h} className="whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {section.rows.map((row, i) => (
                            <tr key={i}>
                              {row.map((cell, j) => (
                                <td
                                  key={j}
                                  className="whitespace-nowrap"
                                >
                                  {cell ?? "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </PremiumTableWrapper>
                  )}
                </div>
              ))}
            </>
          )}
        </SpotlightCard>
      </div>
    </div>
  );
}

function ReportTypeCard({
  meta,
  active,
  onSelect,
}: {
  meta: ReportTypeMeta;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = REPORT_ICONS[meta.type];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`premium-hover-lift rounded-2xl border p-4 text-left transition-all duration-200 ${
        active
          ? "border-brand-400/60 bg-gradient-to-br from-brand-50/80 to-white shadow-glow ring-1 ring-brand-400/30"
          : "border-surface-border/80 bg-white/90 shadow-card hover:border-brand-200/60"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            active
              ? "bg-gradient-to-br from-brand-100 to-brand-50 text-brand-700 ring-1 ring-brand-200/50"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="font-semibold text-slate-900">{meta.title}</span>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">{meta.description}</p>
    </button>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[] | string[];
  onChange: (value: string) => void;
}) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">
        {label}
      </label>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
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
