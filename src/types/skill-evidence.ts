export type EvidenceSource =
  | "SELF_DECLARED"
  | "FACULTY_VERIFIED"
  | "RESUME_MENTIONED"
  | "GITHUB_LANGUAGE"
  | "GITHUB_REPOSITORY"
  | "CODING_PLATFORM"
  | "COMPANY_REQUIREMENT_MATCH"
  | "PROJECT_EVIDENCE"
  | "CERTIFICATION_EVIDENCE";

export type EvidenceStrength =
  | "NONE"
  | "WEAK"
  | "MODERATE"
  | "STRONG"
  | "VERIFIED";

export interface SkillEvidenceItem {
  id: string;
  studentId: string;
  skillName: string;
  skillCategory: string | null;
  techSkillId: string | null;
  evidenceSources: EvidenceSource[];
  evidenceStrength: EvidenceStrength;
  confidenceScore: number;
  facultyVerified: boolean;
  resumeMentioned: boolean;
  githubEvidence: boolean;
  codingPlatformEvidence: boolean;
  companyRequirementEvidence: boolean;
  projectEvidence: boolean;
  certificationEvidence: boolean;
  suggestedAction: string | null;
  notes: string | null;
  updatedAt: string;
}

export interface SkillEvidenceSummary {
  totalClaimed: number;
  verifiedCount: number;
  strongCount: number;
  weakCount: number;
  missingRequiredCount: number;
}

export interface StudentSkillEvidenceBundle {
  studentId: string;
  summary: SkillEvidenceSummary;
  items: SkillEvidenceItem[];
  lastRefreshedAt: string | null;
}

export interface SkillEvidenceFilters {
  search?: string;
  branch?: string;
  batch?: string;
  evidenceStrength?: EvidenceStrength;
  skillCategory?: string;
  evidenceSource?: EvidenceSource;
  page?: number;
  pageSize?: number;
}

export interface SkillEvidenceOverviewItem {
  studentId: string;
  fullName: string;
  rollNumber: string;
  branch: string;
  batch: string;
  totalSkills: number;
  verifiedCount: number;
  strongCount: number;
  weakCount: number;
  avgConfidence: number;
  lastRefreshedAt: string | null;
}

export interface SkillEvidenceOverviewResult {
  items: SkillEvidenceOverviewItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CompanySkillEvidenceFit {
  requirementId: string;
  roleTitle: string;
  companyName: string;
  requiredSkills: CompanySkillEvidenceRow[];
  preferredSkills: CompanySkillEvidenceRow[];
  missingRequired: string[];
  weakEvidenceSkills: string[];
  verifiedMatching: string[];
}

export interface CompanySkillEvidenceRow {
  skillName: string;
  evidenceStrength: EvidenceStrength;
  evidenceSources: EvidenceSource[];
  inTechStack: boolean;
  suggestedAction: string | null;
}

export interface SkillEvidenceDashboardStats {
  studentsWithStrongEvidence: number;
  weaklyEvidencedSkills: { skill: string; count: number }[];
  topVerifiedSkills: { skill: string; count: number }[];
  branchEvidence: { branch: string; strong: number; weak: number; students: number }[];
  topMissingAreas: { area: string; count: number }[];
}

export interface HrSafeEvidenceSummary {
  verifiedSkills: string[];
  strongEvidenceSkills: string[];
  skillsNeedingProof: string[];
  githubSummary: string | null;
  codingPlatformSummary: string | null;
}
