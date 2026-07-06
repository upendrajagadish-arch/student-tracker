import { ReportFilterSummary } from "@/components/reports/print/ReportFilterSummary";
import { ReportFooter } from "@/components/reports/print/ReportFooter";
import { ReportHeader } from "@/components/reports/print/ReportHeader";
import { ReportSectionBlock } from "@/components/reports/print/ReportSection";
import { ReportSummaryCards } from "@/components/reports/print/ReportSummaryCards";
import type { ReportFilterLabels } from "@/lib/services/reports";
import type { PublicBrandingSettings } from "@/types/branding";
import type { ReportResult } from "@/types/reports";
import type { ReactNode } from "react";

interface ReportPrintLayoutProps {
  report: ReportResult;
  filterLabels: ReportFilterLabels;
  branding: PublicBrandingSettings;
  actions?: ReactNode;
}

export function ReportPrintLayout({
  report,
  filterLabels,
  branding,
  actions,
}: ReportPrintLayoutProps) {
  const hasData =
    report.summary.length > 0 ||
    report.sections.some((s) => s.rows.length > 0);

  return (
    <div className="report-print-document mx-auto max-w-[210mm] bg-white px-6 py-8 sm:px-10 print:max-w-none print:px-0 print:py-0">
      {actions && (
        <div className="report-print-actions mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          {actions}
        </div>
      )}

      <ReportHeader
        title={report.title}
        description={report.description}
        generatedAt={report.generatedAt}
        branding={branding}
      />

      <div className="mt-6 space-y-6">
        <ReportFilterSummary filters={filterLabels} />

        {report.warnings?.map((w) => (
          <div
            key={w}
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {w}
          </div>
        ))}

        {report.truncated && report.rowCap && (
          <p className="text-xs text-slate-500">
            Displaying first {report.rowCap.toLocaleString()} rows per section in
            this print view.
          </p>
        )}

        {!hasData ? (
          <p className="py-12 text-center text-sm text-slate-500">
            No data available for the selected filters.
          </p>
        ) : (
          <>
            {report.summary.length > 0 && (
              <div className="report-executive-summary">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">
                  Executive Summary
                </h2>
                <ReportSummaryCards items={report.summary} />
              </div>
            )}

            <div className="space-y-8">
              {report.sections.map((section) => (
                <ReportSectionBlock key={section.title} section={section} />
              ))}
            </div>
          </>
        )}

        <ReportFooter branding={branding} />
      </div>
    </div>
  );
}
