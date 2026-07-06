"use client";

import {
  EvidenceSourceChip,
  EvidenceStrengthBadge,
} from "@/components/skill-evidence/EvidenceBadges";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { SKILL_CATEGORY_LABELS } from "@/lib/tech-constants";
import {
  EVIDENCE_SOURCE_OPTIONS,
  EVIDENCE_STRENGTH_OPTIONS,
} from "@/lib/skill-evidence-constants";
import { formatDate } from "@/lib/utils";
import type {
  EvidenceSource,
  EvidenceStrength,
  StudentSkillEvidenceBundle,
} from "@/types/skill-evidence";
import {
  AlertTriangle,
  Award,
  HelpCircle,
  Layers,
  Network,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface SkillEvidenceCardProps {
  studentId: string;
  initialBundle: StudentSkillEvidenceBundle | null;
  canRefresh: boolean;
}

export function SkillEvidenceCard({
  studentId,
  initialBundle,
  canRefresh,
}: SkillEvidenceCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [bundle, setBundle] = useState(initialBundle);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [strengthFilter, setStrengthFilter] = useState<EvidenceStrength | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState<EvidenceSource | "">("");

  const categories = useMemo(() => {
    const set = new Set<string>();
    bundle?.items.forEach((i) => {
      if (i.skillCategory) set.add(i.skillCategory);
    });
    return [...set].sort();
  }, [bundle]);

  const filteredItems = useMemo(() => {
    if (!bundle) return [];
    return bundle.items.filter((item) => {
      if (strengthFilter && item.evidenceStrength !== strengthFilter) return false;
      if (categoryFilter && item.skillCategory !== categoryFilter) return false;
      if (sourceFilter && !item.evidenceSources.includes(sourceFilter)) return false;
      return true;
    });
  }, [bundle, strengthFilter, categoryFilter, sourceFilter]);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/students/${studentId}/skill-evidence/refresh`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed to refresh evidence", "error");
        return;
      }
      setBundle(data);
      toast("Skill evidence refreshed", "success");
      router.refresh();
    } catch {
      toast("Failed to refresh evidence", "error");
    } finally {
      setIsRefreshing(false);
    }
  }

  const summary = bundle?.summary ?? {
    totalClaimed: 0,
    verifiedCount: 0,
    strongCount: 0,
    weakCount: 0,
    missingRequiredCount: 0,
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-surface-border bg-gradient-to-r from-brand-50/80 via-white to-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
                <Network className="h-5 w-5" />
              </span>
              Skill Evidence Graph
            </CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              Unified view of how each skill is supported by tech stack, faculty,
              resume, GitHub, coding platforms, and company matches.
            </CardDescription>
          </div>
          {canRefresh && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="shadow-sm"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing…" : "Refresh Evidence"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            label="Claimed Skills"
            value={summary.totalClaimed}
            icon={Layers}
            tone="slate"
          />
          <SummaryCard
            label="Verified"
            value={summary.verifiedCount}
            icon={ShieldCheck}
            tone="brand"
          />
          <SummaryCard
            label="Strong Evidence"
            value={summary.strongCount}
            icon={Sparkles}
            tone="emerald"
          />
          <SummaryCard
            label="Weak Evidence"
            value={summary.weakCount}
            icon={AlertTriangle}
            tone="amber"
          />
          <SummaryCard
            label="Missing Required"
            value={summary.missingRequiredCount}
            icon={Award}
            tone={summary.missingRequiredCount > 0 ? "rose" : "slate"}
            highlight={summary.missingRequiredCount > 0}
          />
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-brand-100 bg-brand-50/50 px-4 py-3 text-xs text-slate-600">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <p>
            <span className="font-medium text-slate-800">How strength is calculated: </span>
            faculty verification plus external proof = Verified; two or more sources =
            Strong; resume + self-declared = Moderate; self-declared only = Weak.
          </p>
        </div>

        {!bundle || bundle.items.length === 0 ? (
          <EmptyState
            icon={Network}
            title="No skill evidence yet"
            description={
              canRefresh
                ? "Generate a snapshot from tech stack, resume, GitHub, and coding profiles to see unified evidence."
                : "Skill evidence has not been generated for this student."
            }
            action={
              canRefresh ? (
                <Button onClick={handleRefresh} isLoading={isRefreshing}>
                  <RefreshCw className="h-4 w-4" />
                  Generate Evidence
                </Button>
              ) : undefined
            }
            className="py-12"
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-surface-border bg-slate-50/80 p-3">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Filters
              </span>
              <Select
                value={strengthFilter}
                onChange={(e) =>
                  setStrengthFilter(e.target.value as EvidenceStrength | "")
                }
                className="h-9 w-40 bg-white"
              >
                <option value="">All strengths</option>
                {EVIDENCE_STRENGTH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 w-44 bg-white"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {SKILL_CATEGORY_LABELS[c as keyof typeof SKILL_CATEGORY_LABELS] ?? c}
                  </option>
                ))}
              </Select>
              <Select
                value={sourceFilter}
                onChange={(e) =>
                  setSourceFilter(e.target.value as EvidenceSource | "")
                }
                className="h-9 w-44 bg-white"
              >
                <option value="">All sources</option>
                {EVIDENCE_SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <span className="ml-auto text-xs text-slate-500">
                {filteredItems.length} of {bundle.items.length} skills
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-surface-border bg-white shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-surface-border bg-slate-50/80">
                      <th className="px-4 py-3 font-medium text-slate-600">Skill</th>
                      <th className="px-4 py-3 font-medium text-slate-600">Category</th>
                      <th className="px-4 py-3 font-medium text-slate-600">Strength</th>
                      <th className="px-4 py-3 font-medium text-slate-600">Sources</th>
                      <th className="px-4 py-3 font-medium text-slate-600">Suggested Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        className="align-top transition-colors hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-3.5 font-medium text-slate-900">
                          {item.skillName}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {item.skillCategory
                            ? SKILL_CATEGORY_LABELS[
                                item.skillCategory as keyof typeof SKILL_CATEGORY_LABELS
                              ] ?? item.skillCategory
                            : "—"}
                        </td>
                        <td className="px-4 py-3.5">
                          <EvidenceStrengthBadge strength={item.evidenceStrength} />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex max-w-xs flex-wrap gap-1">
                            {item.evidenceSources.map((s) => (
                              <EvidenceSourceChip key={s} source={s} />
                            ))}
                          </div>
                        </td>
                        <td className="max-w-xs px-4 py-3.5 text-xs leading-relaxed text-slate-500">
                          {item.suggestedAction ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredItems.length === 0 && (
                <p className="border-t border-surface-border p-8 text-center text-sm text-slate-500">
                  No skills match the selected filters.
                </p>
              )}
            </div>

            {bundle.lastRefreshedAt && (
              <p className="text-xs text-slate-400">
                Last updated {formatDate(bundle.lastRefreshedAt)}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

const TONE_STYLES = {
  slate: {
    icon: "bg-slate-100 text-slate-600",
    card: "border-surface-border bg-white",
  },
  brand: {
    icon: "bg-brand-100 text-brand-700",
    card: "border-brand-100 bg-brand-50/30",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-700",
    card: "border-emerald-100 bg-emerald-50/40",
  },
  amber: {
    icon: "bg-amber-100 text-amber-700",
    card: "border-amber-100 bg-amber-50/40",
  },
  rose: {
    icon: "bg-rose-100 text-rose-700",
    card: "border-rose-200 bg-rose-50",
  },
} as const;

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
  highlight,
}: {
  label: string;
  value: number;
  icon: typeof Layers;
  tone: keyof typeof TONE_STYLES;
  highlight?: boolean;
}) {
  const styles = TONE_STYLES[highlight ? "rose" : tone];
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-card ${styles.card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">
            {value}
          </p>
        </div>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}
