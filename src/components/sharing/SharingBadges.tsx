"use client";

import { cn } from "@/lib/utils";
import {
  HR_DECISION_LABELS,
  HR_DECISION_STYLES,
  SHARE_STATUS_LABELS,
  SHARE_STATUS_STYLES,
} from "@/lib/sharing-constants";
import type { HRDecision, ShareStatus } from "@/types/sharing";

export function ShareStatusBadge({
  status,
  className,
}: {
  status: ShareStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        SHARE_STATUS_STYLES[status],
        className
      )}
    >
      {SHARE_STATUS_LABELS[status]}
    </span>
  );
}

export function HRDecisionBadge({
  decision,
  className,
}: {
  decision: HRDecision;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        HR_DECISION_STYLES[decision],
        className
      )}
    >
      {HR_DECISION_LABELS[decision]}
    </span>
  );
}
