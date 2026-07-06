import { cn } from "@/lib/utils";
import { JOB_STATUS_LABELS } from "@/lib/job-constants";
import type { JobStatus } from "@/types/jobs";

const STATUS_STYLES: Record<JobStatus, string> = {
  QUEUED: "bg-slate-100 text-slate-700",
  RUNNING: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800",
  CANCELLED: "bg-amber-100 text-amber-800",
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
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
        className
      )}
    >
      {JOB_STATUS_LABELS[status]}
    </span>
  );
}
