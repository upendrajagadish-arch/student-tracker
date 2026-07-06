import type { ResumeReviewStatus } from "@/types";

export type ResumeReviewStatusType = ResumeReviewStatus;

export const RESUME_REVIEW_STATUS_LABELS: Record<ResumeReviewStatus, string> = {
  NOT_UPLOADED: "Not Uploaded",
  UPLOADED: "Uploaded",
  UNDER_REVIEW: "Under Review",
  REVIEWED: "Reviewed",
  NEEDS_IMPROVEMENT: "Needs Improvement",
  APPROVED: "Approved",
};

export const RESUME_REVIEW_STATUS_OPTIONS = Object.entries(
  RESUME_REVIEW_STATUS_LABELS
)
  .filter(([value]) => value !== "NOT_UPLOADED")
  .map(([value, label]) => ({
    value: value as ResumeReviewStatus,
    label,
  }));

export const ALLOWED_RESUME_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const ALLOWED_RESUME_EXTENSIONS = [".pdf", ".docx"] as const;

export const MAX_RESUME_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
};
