"use client";

import { cn } from "@/lib/utils";
import {
  PROFICIENCY_LABELS,
  VERIFICATION_STATUS_LABELS,
} from "@/lib/tech-constants";
import type { ProficiencyLevel, VerificationStatus } from "@/types/tech-stack";
import { CheckCircle2 } from "lucide-react";

const proficiencyStyles: Record<ProficiencyLevel, string> = {
  BEGINNER: "bg-slate-100 text-slate-700",
  INTERMEDIATE: "bg-blue-50 text-blue-700",
  ADVANCED: "bg-violet-50 text-violet-700",
};

const verificationStyles: Record<VerificationStatus, string> = {
  SELF_DECLARED: "bg-slate-100 text-slate-600",
  FACULTY_VERIFIED: "bg-emerald-50 text-emerald-700",
  PERFORMANCE_VERIFIED: "bg-teal-50 text-teal-700",
  RESUME_EVIDENCE: "bg-indigo-50 text-indigo-700",
  GITHUB_EVIDENCE: "bg-purple-50 text-purple-700",
  NOT_VERIFIED: "bg-amber-50 text-amber-700",
};

export function ProficiencyBadge({
  level,
  className,
}: {
  level: ProficiencyLevel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        proficiencyStyles[level],
        className
      )}
    >
      {PROFICIENCY_LABELS[level]}
    </span>
  );
}

export function VerificationBadge({
  status,
  className,
}: {
  status: VerificationStatus;
  className?: string;
}) {
  const isVerified = status !== "NOT_VERIFIED" && status !== "SELF_DECLARED";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        verificationStyles[status],
        className
      )}
    >
      {isVerified && <CheckCircle2 className="h-3 w-3" />}
      {VERIFICATION_STATUS_LABELS[status]}
    </span>
  );
}

export function SkillBadge({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700",
        className
      )}
    >
      {name}
    </span>
  );
}
