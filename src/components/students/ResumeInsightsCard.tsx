"use client";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import {
  confidenceBadgeClass,
  confidenceLabel,
} from "@/lib/jd-parser-utils";
import type { ResumeInsightRecord } from "@/types/resume-insights";
import { AlertTriangle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function providerBadge(provider: string): string {
  return provider === "openai" ? "AI-assisted" : "Fallback";
}

interface ResumeInsightsCardProps {
  resumeId: string;
  canAnalyze: boolean;
  canApply: boolean;
  initialInsight?: ResumeInsightRecord | null;
  onApplied?: () => void;
}

export function ResumeInsightsCard({
  resumeId,
  canAnalyze,
  canApply,
  initialInsight = null,
  onApplied,
}: ResumeInsightsCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [insight, setInsight] = useState<ResumeInsightRecord | null>(
    initialInsight
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);

  const loadInsight = useCallback(async () => {
    const res = await fetch(`/api/resumes/${resumeId}/insights`);
    const data = await res.json();
    if (res.ok) setInsight(data.data ?? null);
  }, [resumeId]);

  useEffect(() => {
    if (!initialInsight) {
      loadInsight().catch(() => undefined);
    }
  }, [initialInsight, loadInsight]);

  async function handleAnalyze() {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/insights/analyze`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Could not analyze resume.", "error");
        return;
      }
      setInsight(data.data);
      toast("Resume insight generated — review before applying.", "success");
    } catch {
      toast("Could not analyze resume.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleApply() {
    if (!insight) return;
    setIsApplying(true);
    try {
      const res = await fetch(`/api/resume-insights/${insight.id}/apply`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Could not apply insight.", "error");
        return;
      }
      setInsight(data.data);
      toast("Suggestions applied to resume review. Verify and save if needed.", "success");
      onApplied?.();
      router.refresh();
    } finally {
      setIsApplying(false);
      setShowApplyConfirm(false);
    }
  }

  async function handleDismiss() {
    if (!insight) return;
    setIsDismissing(true);
    try {
      const res = await fetch(`/api/resume-insights/${insight.id}/dismiss`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Could not dismiss insight.", "error");
        return;
      }
      setInsight(null);
      toast("Insight dismissed.", "success");
    } finally {
      setIsDismissing(false);
    }
  }

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-600" />
              Resume Insights
            </CardTitle>
            <CardDescription>
              Structured analysis to assist manual review. Nothing is saved to
              the official review until you apply suggestions.
            </CardDescription>
          </div>
          {canAnalyze && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAnalyze}
              isLoading={isAnalyzing}
            >
              Analyze Resume
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!insight ? (
          <div className="rounded-xl border border-dashed border-surface-border py-10 text-center">
            <p className="text-sm font-medium text-slate-900">
              No insight generated yet
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {canAnalyze
                ? "Run analysis to detect skills, ATS issues, and alignment with the tech stack."
                : "Insights are not available for your role."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${confidenceBadgeClass(insight.confidenceScore)}`}
              >
                {confidenceLabel(insight.confidenceScore)} ·{" "}
                {Math.round(insight.confidenceScore * 100)}%
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {providerBadge(insight.provider)}
              </span>
              {insight.reviewStatus === "APPLIED" && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  Applied to review
                </span>
              )}
            </div>

            {!insight.aiEnabled && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                AI is not configured — insights are basic rule-based analysis.
              </div>
            )}

            <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
              Review all suggestions before applying. Staff remains responsible
              for the final resume review.
            </div>

            {insight.summary && (
              <InsightBlock title="Summary" content={insight.summary} />
            )}

            {insight.suggestedResumeScore != null && (
              <p className="text-sm text-slate-700">
                <span className="font-medium">Suggested resume score:</span>{" "}
                {Math.round(insight.suggestedResumeScore)} / 100
              </p>
            )}

            <ChipSection title="Detected skills" items={insight.detectedSkills} />
            <ChipSection title="Missing sections" items={insight.missingSections} tone="sky" />
            <ChipSection title="ATS issues" items={insight.atsIssues} tone="amber" />
            <ChipSection
              title="Improvement suggestions"
              items={insight.improvementSuggestions}
            />

            {insight.roleSuitability.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Role suitability
                </p>
                <ul className="mt-2 space-y-2">
                  {insight.roleSuitability.map((item) => (
                    <li
                      key={`${item.role}-${item.fit}`}
                      className="rounded-lg border border-surface-border bg-white px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-slate-900">{item.role}</span>
                      <span className="ml-2 text-xs uppercase text-slate-500">
                        {item.fit}
                      </span>
                      <p className="mt-1 text-slate-600">{item.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {insight.resumeTruthWarnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-900">
                  <AlertTriangle className="h-4 w-4" />
                  Resume truth warnings
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-950">
                  {insight.resumeTruthWarnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Flag label="LinkedIn in resume" value={insight.linkedInDetected} />
              <Flag label="GitHub in resume" value={insight.githubDetected} />
              <Flag label="Projects section" value={insight.projectsDetected} />
              <Flag label="Certifications" value={insight.certificationsDetected} />
              <Flag label="ATS-friendly estimate" value={insight.atsFriendlyEstimate} />
            </div>

            {canApply && insight.reviewStatus !== "APPLIED" && (
              <div className="flex flex-wrap gap-2 border-t border-surface-border pt-4">
                <Button onClick={() => setShowApplyConfirm(true)}>
                  Apply Suggestions to Review
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleDismiss}
                  isLoading={isDismissing}
                >
                  Dismiss Insight
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={showApplyConfirm}
        title="Apply insight to resume review?"
        description={`This will update resume score, ATS flags, profile section flags, and append ${providerBadge(insight?.provider ?? "rules").toLowerCase()} notes to reviewer comments. You can still edit the review form before approving.`}
        confirmLabel="Apply suggestions"
        isLoading={isApplying}
        onConfirm={handleApply}
        onCancel={() => setShowApplyConfirm(false)}
      />
    </Card>
  );
}

function InsightBlock({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-1 text-sm text-slate-700">{content}</p>
    </div>
  );
}

function ChipSection({
  title,
  items,
  tone = "slate",
}: {
  title: string;
  items: string[];
  tone?: "slate" | "amber" | "sky";
}) {
  if (items.length === 0) return null;
  const toneClass =
    tone === "amber"
      ? "bg-amber-50 text-amber-900"
      : tone === "sky"
        ? "bg-sky-50 text-sky-900"
        : "bg-slate-100 text-slate-700";

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className={`rounded-full px-3 py-1 text-xs font-medium ${toneClass}`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function Flag({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <span
        className={`h-2 w-2 rounded-full ${value ? "bg-emerald-500" : "bg-slate-300"}`}
      />
      {label}: {value ? "Yes" : "No"}
    </div>
  );
}
