"use client";

import { cn } from "@/lib/utils";
import {
  READINESS_STATUS_BADGE_STYLES,
  READINESS_STATUS_LABELS,
  RISK_BADGE_STYLES,
  RISK_LEVEL_LABELS,
} from "@/lib/readiness-constants";
import type { ReadinessStatus, RiskLevel } from "@/types/readiness";

export function RiskBadge({
  level,
  className,
}: {
  level: RiskLevel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        RISK_BADGE_STYLES[level],
        className
      )}
    >
      {RISK_LEVEL_LABELS[level]}
    </span>
  );
}

export function ReadinessStatusBadge({
  status,
  className,
}: {
  status: ReadinessStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        READINESS_STATUS_BADGE_STYLES[status],
        className
      )}
    >
      {READINESS_STATUS_LABELS[status]}
    </span>
  );
}

export function ScoreMeter({
  score,
  label,
  showValue = true,
}: {
  score: number;
  label: string;
  showValue?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, score));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        {showValue && (
          <span className="font-medium text-slate-900">{score.toFixed(1)}</span>
        )}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
