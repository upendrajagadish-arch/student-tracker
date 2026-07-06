import type { JobStatus, JobType } from "@/types/jobs";

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  BULK_READINESS_RECALC: "Bulk Readiness Recalc",
  COMPANY_MATCHING: "Company Matching",
  STUDENT_IMPORT: "Student Import",
  STUDENT_EXPORT: "Student Export",
  REPORT_EXPORT: "Report Export",
  DRIVE_EXPORT: "Drive Export",
  GITHUB_SYNC: "GitHub Sync",
  SKILL_EVIDENCE_REFRESH: "Skill Evidence Refresh",
  SYSTEM: "System",
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  QUEUED: "Queued",
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const JOB_STATUS_OPTIONS = Object.entries(JOB_STATUS_LABELS).map(
  ([value, label]) => ({ value: value as JobStatus, label })
);

export const JOB_TYPE_OPTIONS = Object.entries(JOB_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as JobType, label })
);

/** Imports at or above this row count run as tracked jobs. */
export const LARGE_IMPORT_JOB_THRESHOLD = 50;
