import { formatDate } from "@/lib/utils";
import type { PublicBrandingSettings } from "@/types/branding";
import Image from "next/image";

interface ReportHeaderProps {
  title: string;
  description?: string;
  generatedAt: string;
  branding: PublicBrandingSettings;
}

export function ReportHeader({
  title,
  description,
  generatedAt,
  branding,
}: ReportHeaderProps) {
  const accent = branding.primaryColor ?? "#4f46e5";

  return (
    <header className="report-print-header border-b border-slate-200 pb-6">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          {branding.logoUrl ? (
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <Image
                src={branding.logoUrl}
                alt={`${branding.institutionName} logo`}
                fill
                className="object-contain p-1"
                unoptimized
              />
            </div>
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              {branding.institutionName
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-lg font-bold text-slate-900">
              {branding.institutionName}
            </p>
            <p className="text-sm font-medium text-slate-600">
              {branding.placementCellName}
            </p>
            {branding.reportHeaderText && (
              <p className="mt-1 max-w-md text-xs text-slate-500">
                {branding.reportHeaderText}
              </p>
            )}
            <p className="mt-2 text-[10px] uppercase tracking-widest text-slate-400">
              {branding.productName} · {branding.tagline}
            </p>
          </div>
        </div>
        <div className="text-right text-xs text-slate-500">
          {branding.defaultAcademicYear && (
            <p className="font-medium text-slate-700">
              AY {branding.defaultAcademicYear}
            </p>
          )}
          <p className="mt-1">Generated {formatDate(generatedAt)}</p>
        </div>
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          {description}
        </p>
      )}
    </header>
  );
}
