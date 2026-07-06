export type ImportRowStatus = "valid" | "invalid" | "duplicate" | "update";

export interface ImportRow {
  fullName: string;
  rollNumber: string;
  email: string;
  phone?: string;
  branch: string;
  section?: string;
  batch: string;
  graduationYear: number;
  cgpa?: number;
  activeBacklogs?: number;
  placementStatus?:
    | "NOT_STARTED"
    | "IN_TRAINING"
    | "READY"
    | "SHORTLISTED"
    | "PLACED"
    | "NEEDS_ATTENTION";
  linkedinUrl?: string;
  githubUrl?: string;
}

export interface ImportSummary {
  total: number;
  valid: number;
  update: number;
  duplicate: number;
  invalid: number;
}

export interface PreviewImportRow {
  rowNumber: number;
  raw: Record<string, string>;
  data?: ImportRow;
  errors: string[];
  status: ImportRowStatus;
  duplicateReason?: string;
}
