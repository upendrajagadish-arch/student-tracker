"use client";

import { RequirementForm } from "@/components/companies/RequirementForm";
import { JdParsePanel } from "@/components/companies/JdParsePanel";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import {
  confidenceBadgeClass,
  confidenceLabel,
  providerLabel,
} from "@/lib/jd-parser-utils";
import type { CompanyRequirementDetail } from "@/types/company";
import type { JDParseDraft, JDParseResult } from "@/types/jd-parser";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CompanyOption {
  id: string;
  name: string;
}

interface JdParserPageClientProps {
  basePath: string;
  companies: CompanyOption[];
  initialCompanyId?: string;
  initialCompanyName?: string;
}

export function JdParserPageClient({
  basePath,
  companies,
  initialCompanyId,
  initialCompanyName,
}: JdParserPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<"paste" | "review" | "done">("paste");
  const [parseResult, setParseResult] = useState<JDParseResult | null>(null);
  const [companyId, setCompanyId] = useState(initialCompanyId ?? "");
  const [companyName, setCompanyName] = useState(initialCompanyName ?? "");
  const [savedRequirement, setSavedRequirement] =
    useState<CompanyRequirementDetail | null>(null);
  const [isRunningMatch, setIsRunningMatch] = useState(false);

  function handleParsed(result: JDParseResult, resolvedCompanyId: string) {
    const company =
      companies.find((c) => c.id === resolvedCompanyId) ??
      (initialCompanyId === resolvedCompanyId
        ? { id: resolvedCompanyId, name: initialCompanyName ?? "" }
        : null);

    setParseResult(result);
    setCompanyId(resolvedCompanyId);
    setCompanyName(company?.name ?? initialCompanyName ?? "");
    setStep("review");
  }

  async function handleRunMatching() {
    if (!savedRequirement) return;
    setIsRunningMatch(true);
    try {
      const res = await fetch(
        `/api/company-requirements/${savedRequirement.id}/match`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Could not start matching.", "error");
        return;
      }
      toast("Matching job started.", "success");
      router.push(`${basePath}/${savedRequirement.companyId}/requirements/${savedRequirement.id}`);
    } finally {
      setIsRunningMatch(false);
    }
  }

  const backHref = companyId
    ? `${basePath}/${companyId}`
    : basePath;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parse Job Description"
        description="Extract a structured requirement draft from a JD. Review every field before saving."
        actions={
          <Link href={backHref}>
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />

      {step === "paste" && (
        <JdParsePanel
          companies={initialCompanyId ? [] : companies}
          defaultCompanyId={initialCompanyId}
          defaultCompanyName={initialCompanyName}
          onParsed={handleParsed}
          onManual={() => {
            if (companyId || initialCompanyId) {
              router.push(
                `${basePath}/${companyId || initialCompanyId}/requirements/new`
              );
            } else {
              toast("Select a company first, or add one from Companies.", "error");
            }
          }}
        />
      )}

      {step === "review" && parseResult && (
        <>
          <section className="rounded-xl border border-surface-border bg-slate-50 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${confidenceBadgeClass(parseResult.confidenceScore)}`}
              >
                {confidenceLabel(parseResult.confidenceScore)} confidence ·{" "}
                {Math.round(parseResult.confidenceScore * 100)}%
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                {providerLabel(parseResult)}
              </span>
            </div>

            {parseResult.warnings.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Warnings
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {parseResult.warnings.map((warning) => (
                    <span
                      key={warning}
                      className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-900"
                    >
                      {warning}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {parseResult.missingInfo.length > 0 && (
              <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
                  Missing or unclear
                </p>
                <ul className="mt-2 list-inside list-disc text-sm text-sky-900">
                  {parseResult.missingInfo.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <RequirementForm
            mode="create"
            companyId={companyId}
            companyName={companyName}
            redirectPath={backHref}
            initialDraft={parseResult.draft}
            fromJdParser
            forceDraftStatus
            onCreated={(requirement) => {
              setSavedRequirement(requirement);
              setStep("done");
              toast("Requirement draft saved.", "success");
            }}
            topActions={
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setStep("paste");
                  setParseResult(null);
                }}
              >
                Parse Different JD
              </Button>
            }
          />
        </>
      )}

      {step === "done" && savedRequirement && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">
            Requirement draft saved
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {savedRequirement.roleTitle} for {savedRequirement.companyName} is saved
            as a draft. Activate it when ready, or run matching now.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={handleRunMatching} isLoading={isRunningMatch}>
              Run Matching Now
            </Button>
            <Link
              href={`${basePath}/${savedRequirement.companyId}/requirements/${savedRequirement.id}`}
            >
              <Button variant="secondary">Go to Requirement</Button>
            </Link>
            <Link href={`${basePath}/${savedRequirement.companyId}`}>
              <Button variant="secondary">Back to Company</Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
