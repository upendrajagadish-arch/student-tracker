"use client";

import { cn, formatScore } from "@/lib/utils";

interface ReadinessBadgeProps {
  score: number;
  className?: string;
  showLabel?: boolean;
}

function getScoreStyle(score: number): string {
  if (score >= 80) return "bg-emerald-50 text-emerald-700";
  if (score >= 60) return "bg-blue-50 text-blue-700";
  if (score >= 40) return "bg-amber-50 text-amber-800";
  return "bg-red-50 text-red-700";
}

export function ReadinessBadge({
  score,
  className,
  showLabel = false,
}: ReadinessBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        getScoreStyle(score),
        className
      )}
    >
      {showLabel && <span>Readiness</span>}
      {formatScore(score)}
    </span>
  );
}
