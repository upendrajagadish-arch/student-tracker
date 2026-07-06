import { ReportTable } from "@/components/reports/print/ReportTable";
import type { ReportSection as ReportSectionType } from "@/types/reports";

export function ReportSectionBlock({ section }: { section: ReportSectionType }) {
  return (
    <section className="report-section break-inside-avoid-page">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">
        {section.title}
      </h2>
      <ReportTable section={section} />
    </section>
  );
}
