"use client";

import {
  ReadinessStatusBadge,
  RiskBadge,
  ScoreMeter,
} from "@/components/readiness/ReadinessBadges";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { READINESS_CATEGORY_LABELS } from "@/lib/readiness-constants";
import { formatDate, formatScore } from "@/lib/utils";
import type { ReadinessSnapshotItem } from "@/types/readiness";
import { Gauge, RefreshCw, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface PlacementReadinessCardProps {
  studentId: string;
  snapshot: ReadinessSnapshotItem | null;
  canRecalculate: boolean;
}

export function PlacementReadinessCard({
  studentId,
  snapshot,
  canRecalculate,
}: PlacementReadinessCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [current, setCurrent] = useState(snapshot);

  async function handleRecalculate() {
    setIsRecalculating(true);
    try {
      const res = await fetch(
        `/api/students/${studentId}/readiness/recalculate`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Recalculation failed", "error");
        return;
      }
      setCurrent(data);
      toast("Readiness recalculated", "success");
      router.refresh();
    } catch {
      toast("Recalculation failed", "error");
    } finally {
      setIsRecalculating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-brand-600" />
              Placement Readiness
            </CardTitle>
            <CardDescription>
              Intelligence score from profile, skills, resume, and academics
            </CardDescription>
          </div>
          {canRecalculate && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRecalculate}
              isLoading={isRecalculating}
            >
              <RefreshCw className="h-4 w-4" />
              Recalculate
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!current ? (
          <EmptyState
            icon={Target}
            title="Readiness not calculated yet"
            description="Click Recalculate to generate score."
            className="py-8"
            action={
              canRecalculate ? (
                <Button onClick={handleRecalculate} isLoading={isRecalculating}>
                  Calculate Readiness
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-surface-border bg-slate-50/60 p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Overall Score
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {formatScore(current.overallScore)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ReadinessStatusBadge status={current.readinessStatus} />
                <RiskBadge level={current.riskLevel} />
              </div>
              <p className="ml-auto text-xs text-slate-500">
                Last calculated {formatDate(current.calculatedAt)}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {(
                Object.keys(READINESS_CATEGORY_LABELS) as Array<
                  keyof typeof READINESS_CATEGORY_LABELS
                >
              ).map((key) => (
                <ScoreMeter
                  key={key}
                  label={READINESS_CATEGORY_LABELS[key]}
                  score={current[key]}
                />
              ))}
            </div>

            <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                Next Recommended Action
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {current.nextRecommendedAction}
              </p>
            </div>

            {current.scoreBreakdown.criticalGaps.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Critical Gaps
                </p>
                <div className="flex flex-wrap gap-2">
                  {current.scoreBreakdown.criticalGaps.map((gap) => (
                    <span
                      key={gap}
                      className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800"
                    >
                      {gap}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
