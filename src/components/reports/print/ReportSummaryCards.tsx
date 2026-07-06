import type { ReportSummaryItem } from "@/types/reports";

interface ReportSummaryCardsProps {
  items: ReportSummaryItem[];
}

export function ReportSummaryCards({ items }: ReportSummaryCardsProps) {
  if (items.length === 0) return null;

  return (
    <div className="report-summary-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="report-summary-card rounded-lg border border-slate-200 bg-white px-4 py-3"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {item.label}
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
