"use client";

import { cn } from "@/lib/utils";
import {
  ELIGIBILITY_STATUS_LABELS,
  ELIGIBILITY_STATUS_STYLES,
  MATCH_STATUS_LABELS,
  MATCH_STATUS_STYLES,
  COMPANY_REQUIREMENT_STATUS_LABELS,
} from "@/lib/company-constants";
import type {
  CompanyRequirementStatus,
  EligibilityStatus,
  MatchStatus,
} from "@/types/company";

export function MatchStatusBadge({
  status,
  className,
}: {
  status: MatchStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        MATCH_STATUS_STYLES[status],
        className
      )}
    >
      {MATCH_STATUS_LABELS[status]}
    </span>
  );
}

export function EligibilityStatusBadge({
  status,
  className,
}: {
  status: EligibilityStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        ELIGIBILITY_STATUS_STYLES[status],
        className
      )}
    >
      {ELIGIBILITY_STATUS_LABELS[status]}
    </span>
  );
}

export function RequirementStatusBadge({
  status,
  className,
}: {
  status: CompanyRequirementStatus;
  className?: string;
}) {
  const styles: Record<CompanyRequirementStatus, string> = {
    DRAFT: "bg-slate-100 text-slate-700",
    ACTIVE: "bg-emerald-50 text-emerald-700",
    CLOSED: "bg-amber-50 text-amber-800",
    ARCHIVED: "bg-slate-100 text-slate-500",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status],
        className
      )}
    >
      {COMPANY_REQUIREMENT_STATUS_LABELS[status]}
    </span>
  );
}

export function SkillChip({
  label,
  variant = "default",
}: {
  label: string;
  variant?: "default" | "matched" | "missing" | "risk";
}) {
  const styles = {
    default: "bg-slate-100 text-slate-700",
    matched: "bg-emerald-50 text-emerald-700",
    missing: "bg-red-50 text-red-700",
    risk: "bg-amber-50 text-amber-800",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        styles[variant]
      )}
    >
      {label}
    </span>
  );
}
