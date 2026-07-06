import type { PlacementFinalOutcome } from "@/types/placement-drive";

export type ReportType =
  | "DRIVE_SUMMARY"
  | "COMPANY_PLACEMENT"
  | "BRANCH_PLACEMENT"
  | "BATCH_READINESS"
  | "STUDENT_PLACEMENT_HISTORY"
  | "RESUME_READINESS"
  | "SKILL_GAP"
  | "HR_SHARING"
  | "FINAL_PLACEMENT_OUTCOME"
  | "MANAGEMENT_SUMMARY";

export interface ReportFilters {
  branch?: string;
  batch?: string;
  companyId?: string;
  driveId?: string;
  requirementId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  finalOutcome?: PlacementFinalOutcome;
}

export interface ReportSummaryItem {
  label: string;
  value: string | number;
}

export interface ReportSection {
  title: string;
  headers: string[];
  rows: (string | number | null)[][];
}

export interface ReportResult {
  type: ReportType;
  title: string;
  description: string;
  generatedAt: string;
  summary: ReportSummaryItem[];
  sections: ReportSection[];
  warnings?: string[];
  rowCap?: number;
  truncated?: boolean;
}

export interface ReportFilterOptions {
  branches: string[];
  batches: string[];
  companies: { id: string; name: string }[];
  drives: { id: string; label: string; companyId: string }[];
  requirements: { id: string; label: string; companyId: string }[];
  finalOutcomes: { value: PlacementFinalOutcome; label: string }[];
}

export interface ReportTypeMeta {
  type: ReportType;
  title: string;
  description: string;
  requiresDrive?: boolean;
}

export const REPORT_TYPES: ReportTypeMeta[] = [
  {
    type: "DRIVE_SUMMARY",
    title: "Drive Summary",
    description: "Funnel metrics and student pipeline for a placement drive.",
    requiresDrive: true,
  },
  {
    type: "COMPANY_PLACEMENT",
    title: "Company-wise Placement",
    description: "Matching, HR engagement, and outcomes by company.",
  },
  {
    type: "BRANCH_PLACEMENT",
    title: "Branch-wise Placement",
    description: "Readiness, drive participation, and selections by branch.",
  },
  {
    type: "BATCH_READINESS",
    title: "Batch Readiness",
    description: "Readiness, resume, and tech stack metrics by batch.",
  },
  {
    type: "STUDENT_PLACEMENT_HISTORY",
    title: "Student Placement History",
    description: "Every student's drive participation and outcomes.",
  },
  {
    type: "RESUME_READINESS",
    title: "Resume Readiness",
    description: "Resume upload, review scores, and profile completeness.",
  },
  {
    type: "SKILL_GAP",
    title: "Skill Gap",
    description: "Missing skills across requirements and affected students.",
  },
  {
    type: "HR_SHARING",
    title: "HR Sharing",
    description: "Students shared with HR and review decisions.",
  },
  {
    type: "FINAL_PLACEMENT_OUTCOME",
    title: "Final Placement Outcome",
    description: "Offers, joins, packages, and conversion summary.",
  },
  {
    type: "MANAGEMENT_SUMMARY",
    title: "Management Summary",
    description:
      "Executive overview combining readiness, placement, HR funnel, and outcomes for leadership reviews.",
  },
];

export const REPORT_TYPE_LABELS: Record<ReportType, string> = Object.fromEntries(
  REPORT_TYPES.map((r) => [r.type, r.title])
) as Record<ReportType, string>;
