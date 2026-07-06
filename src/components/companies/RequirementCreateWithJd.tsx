"use client";

import { JdParsePanel } from "@/components/companies/JdParsePanel";
import { RequirementForm } from "@/components/companies/RequirementForm";
import {
  confidenceBadgeClass,
  confidenceLabel,
  providerLabel,
} from "@/lib/jd-parser-utils";
import type { JDParseResult } from "@/types/jd-parser";
import { useState } from "react";

interface RequirementCreateWithJdProps {
  companyId: string;
  companyName: string;
  redirectPath: string;
}

export function RequirementCreateWithJd({
  companyId,
  companyName,
  redirectPath,
}: RequirementCreateWithJdProps) {
  const [parseResult, setParseResult] = useState<JDParseResult | null>(null);
  const [showParser, setShowParser] = useState(true);

  return (
    <div className="space-y-6">
      {showParser && !parseResult && (
        <JdParsePanel
          compact
          defaultCompanyId={companyId}
          defaultCompanyName={companyName}
          onParsed={(result) => {
            setParseResult(result);
            setShowParser(false);
          }}
          onManual={() => setShowParser(false)}
        />
      )}

      {parseResult && (
        <section className="rounded-xl border border-surface-border bg-slate-50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${confidenceBadgeClass(parseResult.confidenceScore)}`}
            >
              {confidenceLabel(parseResult.confidenceScore)} ·{" "}
              {Math.round(parseResult.confidenceScore * 100)}%
            </span>
            <span className="text-xs text-slate-500">
              {providerLabel(parseResult)}
            </span>
          </div>
          {parseResult.warnings.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {parseResult.warnings.map((w) => (
                <span
                  key={w}
                  className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900"
                >
                  {w}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      <RequirementForm
        mode="create"
        companyId={companyId}
        companyName={companyName}
        redirectPath={redirectPath}
        initialDraft={parseResult?.draft}
        fromJdParser={Boolean(parseResult)}
        forceDraftStatus={Boolean(parseResult)}
      />
    </div>
  );
}
