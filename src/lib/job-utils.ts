import type { JobItem, JobMeta } from "@/types/jobs";

export function getJobMeta(job: JobItem): JobMeta | null {
  const meta = job.resultJson?._meta;
  if (meta && typeof meta === "object") {
    return meta as JobMeta;
  }
  return null;
}

export function getJobResultSummary(job: JobItem): string {
  if (job.status === "FAILED") {
    return job.errorMessage ?? "Job failed";
  }
  if (job.status === "RUNNING" || job.status === "QUEUED") {
    return job.progressTotal > 0
      ? `${job.progressCurrent} / ${job.progressTotal} (${job.progressPercent}%)`
      : "In progress…";
  }
  const r = job.resultJson;
  if (!r) return "Completed";

  switch (job.jobType) {
    case "BULK_READINESS_RECALC":
      return `${r.recalculatedCount ?? 0} recalculated, ${r.failedCount ?? 0} failed`;
    case "COMPANY_MATCHING":
      return `${r.studentsChecked ?? 0} checked, ${r.strongFit ?? 0} strong fits`;
    case "STUDENT_IMPORT":
      return `${r.importedCount ?? 0} created, ${r.updatedCount ?? 0} updated`;
    default:
      return "Completed";
  }
}

export function formatJobDuration(ms: unknown): string {
  if (typeof ms !== "number" || ms < 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}m ${rem}s`;
}
