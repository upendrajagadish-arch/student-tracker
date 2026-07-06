export type JobType =
  | "BULK_READINESS_RECALC"
  | "COMPANY_MATCHING"
  | "STUDENT_IMPORT"
  | "STUDENT_EXPORT"
  | "REPORT_EXPORT"
  | "DRIVE_EXPORT"
  | "GITHUB_SYNC"
  | "SKILL_EVIDENCE_REFRESH"
  | "SYSTEM";

export type JobStatus =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface JobMeta {
  requirementId?: string;
  companyId?: string;
  driveId?: string;
  branch?: string;
  batch?: string;
  reportType?: string;
  studentIds?: string[];
}

export interface JobItem {
  id: string;
  jobType: JobType;
  status: JobStatus;
  title: string;
  description: string | null;
  progressCurrent: number;
  progressTotal: number;
  progressPercent: number;
  resultJson: Record<string, unknown> | null;
  errorMessage: string | null;
  createdByUserId: string;
  createdByName?: string | null;
  createdByEmail?: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobFilters {
  status?: JobStatus;
  jobType?: JobType;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface BulkReadinessJobResult {
  totalStudents: number;
  recalculatedCount: number;
  failedCount: number;
  durationMs: number;
  branch?: string;
  batch?: string;
}

export interface CompanyMatchingJobResult {
  requirementId: string;
  requirementTitle: string;
  companyName: string;
  studentsChecked: number;
  matchesCreated: number;
  strongFit: number;
  goodFit: number;
  averageFit: number;
  riskFit: number;
  notFit: number;
  durationMs: number;
}

export interface StudentImportJobResult {
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  invalidCount: number;
  duplicateCount: number;
  durationMs: number;
}

export interface GitHubSyncJobResult {
  totalStudents: number;
  syncedCount: number;
  failedCount: number;
  rateLimitedCount: number;
  durationMs: number;
}

export interface SkillEvidenceRefreshJobResult {
  totalStudents: number;
  processedCount: number;
  failedCount: number;
  durationMs: number;
}
