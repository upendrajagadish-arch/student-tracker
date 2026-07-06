"use client";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { JDParseResult } from "@/types/jd-parser";
import { FileText, Sparkles } from "lucide-react";
import { useState } from "react";

interface CompanyOption {
  id: string;
  name: string;
}

interface JdParsePanelProps {
  companies?: CompanyOption[];
  defaultCompanyId?: string;
  defaultCompanyName?: string;
  compact?: boolean;
  onParsed: (result: JDParseResult, companyId: string) => void;
  onManual?: () => void;
}

export function JdParsePanel({
  companies = [],
  defaultCompanyId,
  defaultCompanyName,
  compact = false,
  onParsed,
  onManual,
}: JdParsePanelProps) {
  const { toast } = useToast();
  const [jdText, setJdText] = useState("");
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
  const [companyName, setCompanyName] = useState(defaultCompanyName ?? "");
  const [isParsing, setIsParsing] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  async function handleParse() {
    if (!jdText.trim() || jdText.trim().length < 40) {
      toast("Paste a job description with at least 40 characters.", "error");
      return;
    }

    const resolvedCompanyId = companyId || defaultCompanyId;
    if (!resolvedCompanyId && companies.length > 0) {
      toast("Select a company before parsing.", "error");
      return;
    }

    setIsParsing(true);
    setAiNotice(null);

    try {
      const res = await fetch("/api/company-requirements/parse-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jdText,
          companyId: resolvedCompanyId || undefined,
          companyName: companyName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Could not parse job description.", "error");
        return;
      }

      const result = data.data as JDParseResult;
      if (!result.aiEnabled) {
        setAiNotice(
          "AI is not configured — parsed with rule-based fallback. Review all fields before saving."
        );
      } else if (result.provider === "rules") {
        setAiNotice(
          "AI was unavailable — rule-based fallback was used. Review all fields before saving."
        );
      }

      const targetCompanyId =
        resolvedCompanyId ?? companies[0]?.id ?? defaultCompanyId ?? "";
      if (!targetCompanyId) {
        toast("Select a company to continue.", "error");
        return;
      }

      toast("Job description parsed — review the draft below.", "success");
      onParsed(result, targetCompanyId);
    } catch {
      toast("Could not parse job description. Try again or enter manually.", "error");
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <section className="rounded-xl border border-surface-border bg-white p-6 shadow-card">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Sparkles className="h-5 w-5 text-brand-600" />
            {compact ? "Paste JD to Auto-fill" : "Parse Job Description"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Paste a job description to extract eligibility, skills, and criteria.
            You review and confirm before anything is saved.
          </p>
        </div>
        {!compact && (
          <FileText className="hidden h-8 w-8 text-slate-300 sm:block" />
        )}
      </div>

      {companies.length > 0 && !defaultCompanyId && (
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Company
          </label>
          <select
            value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value);
              const selected = companies.find((c) => c.id === e.target.value);
              if (selected) setCompanyName(selected.name);
            }}
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
          >
            <option value="">Select company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {defaultCompanyId && defaultCompanyName && (
        <p className="mb-4 text-sm text-slate-600">
          Company: <span className="font-medium">{defaultCompanyName}</span>
        </p>
      )}

      <textarea
        rows={compact ? 8 : 12}
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
        placeholder="Paste the full job description here..."
        className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm leading-relaxed"
      />

      {aiNotice && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {aiNotice}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={handleParse} isLoading={isParsing}>
          Parse JD
        </Button>
        {onManual && (
          <Button type="button" variant="secondary" onClick={onManual}>
            Edit Manually
          </Button>
        )}
      </div>
    </section>
  );
}
