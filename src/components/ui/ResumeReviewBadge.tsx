"use client";

import { RESUME_REVIEW_STATUS_LABELS } from "@/lib/resume-constants";
import { cn } from "@/lib/utils";
import type { ResumeReviewStatus } from "@/types";

const styles: Record<ResumeReviewStatus, string> = {
  NOT_UPLOADED: "bg-slate-100 text-slate-700",
  UPLOADED: "bg-blue-50 text-blue-700",
  UNDER_REVIEW: "bg-violet-50 text-violet-700",
  REVIEWED: "bg-emerald-50 text-emerald-700",
  NEEDS_IMPROVEMENT: "bg-amber-50 text-amber-800",
  APPROVED: "bg-green-50 text-green-800",
};

export function ResumeReviewBadge({
  status,
  className,
}: {
  status: ResumeReviewStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status],
        className
      )}
    >
      {RESUME_REVIEW_STATUS_LABELS[status]}
    </span>
  );
}
