import { cn } from "@/lib/utils";
import { JOB_STATUS_LABELS } from "@/lib/job-constants";
import type { JobStatus } from "@/types/jobs";

const STATUS_STYLES: Record<JobStatus, string> = {
  QUEUED: "bg-slate-100 text-slate-700 ring-slate-200/70",
  RUNNING: "bg-brand-50 text-brand-800 ring-brand-200/60",
  COMPLETED: "bg-emerald-50 text-emerald-800 ring-emerald-200/60",
  FAILED: "bg-rose-50 text-rose-800 ring-rose-200/60",
  CANCELLED: "bg-amber-50 text-amber-800 ring-amber-200/60",
};

export function JobStatusBadge({
  status,
  className,
}: {
  status: JobStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        STATUS_STYLES[status],
        className
      )}
    >
      {JOB_STATUS_LABELS[status]}
    </span>
  );
}
