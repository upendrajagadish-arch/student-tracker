"use client";

import { PLACEMENT_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PlacementStatus } from "@/types";

const statusStyles: Record<PlacementStatus, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-700",
  IN_TRAINING: "bg-blue-50 text-blue-700",
  READY: "bg-emerald-50 text-emerald-700",
  SHORTLISTED: "bg-violet-50 text-violet-700",
  PLACED: "bg-green-50 text-green-800",
  NEEDS_ATTENTION: "bg-amber-50 text-amber-800",
};

interface StatusBadgeProps {
  status: PlacementStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status],
        className
      )}
    >
      {PLACEMENT_STATUS_LABELS[status]}
    </span>
  );
}
