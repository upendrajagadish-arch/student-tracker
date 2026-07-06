"use client";

import { JobStatusBadge } from "@/components/jobs/JobStatusBadge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { JobItem } from "@/types/jobs";
import { ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface JobProgressPanelProps {
  jobId: string;
  jobsBasePath: string;
  title?: string;
  onComplete?: (job: JobItem) => void;
  className?: string;
}

export function JobProgressPanel({
  jobId,
  jobsBasePath,
  title = "Background job",
  onComplete,
  className,
}: JobProgressPanelProps) {
  const router = useRouter();
  const [job, setJob] = useState<JobItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? data.error ?? "Could not load job status");
        return;
      }
      const next = data.data as JobItem;
      setJob(next);
      setError(null);
      if (next.status === "COMPLETED" || next.status === "FAILED") {
        onComplete?.(next);
        router.refresh();
      }
    } catch {
      setError("Could not load job status");
    }
  }, [jobId, onComplete, router]);

  useEffect(() => {
    void poll();
    const interval = setInterval(() => {
      void poll();
    }, 2000);
    return () => clearInterval(interval);
  }, [poll]);

  const isActive = job?.status === "QUEUED" || job?.status === "RUNNING";
  const percent = job?.progressPercent ?? 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-surface-border bg-white p-4 shadow-card",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Job ID: {jobId.slice(0, 8)}…
          </p>
        </div>
        <div className="flex items-center gap-2">
          {job && <JobStatusBadge status={job.status} />}
          {isActive && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}

      {job && (
        <>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>
                {job.progressTotal > 0
                  ? `${job.progressCurrent.toLocaleString()} / ${job.progressTotal.toLocaleString()}`
                  : "Starting…"}
              </span>
              <span>{percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  job.status === "FAILED"
                    ? "bg-red-500"
                    : job.status === "COMPLETED"
                      ? "bg-emerald-500"
                      : "bg-blue-500"
                )}
                style={{ width: `${Math.max(isActive ? 5 : 0, percent)}%` }}
              />
            </div>
          </div>

          {job.status === "FAILED" && job.errorMessage && (
            <p className="mt-3 text-sm text-red-600">{job.errorMessage}</p>
          )}

          {job.status === "COMPLETED" && job.description && (
            <p className="mt-3 text-sm text-emerald-700">
              Job completed successfully.
            </p>
          )}

          <div className="mt-4">
            <Link href={`${jobsBasePath}/${jobId}`}>
              <Button variant="secondary" size="sm">
                <ExternalLink className="h-3.5 w-3.5" />
                View job details
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
