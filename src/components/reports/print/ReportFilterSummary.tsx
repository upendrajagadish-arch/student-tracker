import type { ReportFilterLabels } from "@/lib/services/reports";

interface ReportFilterSummaryProps {
  filters: ReportFilterLabels;
}

export function ReportFilterSummary({ filters }: ReportFilterSummaryProps) {
  const entries = [
    filters.branch && { label: "Branch", value: filters.branch },
    filters.batch && { label: "Batch", value: filters.batch },
    filters.company && { label: "Company", value: filters.company },
    filters.drive && { label: "Drive", value: filters.drive },
    filters.requirement && { label: "Requirement", value: filters.requirement },
    filters.finalOutcome && { label: "Final Outcome", value: filters.finalOutcome },
    filters.dateFrom && { label: "From", value: filters.dateFrom },
    filters.dateTo && { label: "To", value: filters.dateTo },
  ].filter(Boolean) as { label: string; value: string }[];

  if (entries.length === 0) {
    return (
      <p className="text-xs text-slate-500">Filters: All records (no filters applied)</p>
    );
  }

  return (
    <div className="report-filter-summary rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Filters Applied
      </p>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {entries.map((e) => (
          <div key={e.label} className="flex gap-1.5">
            <dt className="text-slate-500">{e.label}:</dt>
            <dd className="font-medium text-slate-800">{e.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
