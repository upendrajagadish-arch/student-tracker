export type CompanyRequirementStatus =
  | "DRAFT"
  | "ACTIVE"
  | "CLOSED"
  | "ARCHIVED";

export type MatchStatus =
  | "STRONG_FIT"
  | "GOOD_FIT"
  | "AVERAGE_FIT"
  | "RISK_FIT"
  | "NOT_FIT";

export type EligibilityStatus = "ELIGIBLE" | "NOT_ELIGIBLE" | "NEEDS_REVIEW";

export interface CompanyListItem {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  location: string | null;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  isActive: boolean;
  requirementCount: number;
  activeRequirementCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyDetail extends Omit<CompanyListItem, "requirementCount" | "activeRequirementCount"> {
  requirements: CompanyRequirementListItem[];
}

export interface CompanyRequirementListItem {
  id: string;
  companyId: string;
  companyName: string;
  roleTitle: string;
  jobType: string | null;
  status: CompanyRequirementStatus;
  graduationYear: number | null;
  minCgpa: number | null;
  matchCount: number;
  strongFitCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyRequirementDetail {
  id: string;
  companyId: string;
  companyName: string;
  roleTitle: string;
  jobType: string | null;
  eligibleBranches: string[];
  eligibleBatches: string[];
  graduationYear: number | null;
  minCgpa: number | null;
  allowActiveBacklogs: boolean;
  maxActiveBacklogs: number;
  requiredSkills: string[];
  preferredSkills: string[];
  requiredRoleInterests: string[];
  minTechnicalScore: number;
  minCommunicationScore: number;
  minResumeScore: number;
  minReadinessScore: number;
  requireResumeApproved: boolean;
  requireAtsFriendly: boolean;
  requireLinkedIn: boolean;
  requireGitHub: boolean;
  notes: string | null;
  status: CompanyRequirementStatus;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyMatchItem {
  id: string;
  companyRequirementId: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  branch: string;
  batch: string;
  email: string;
  phone: string | null;
  cgpa: number | null;
  activeBacklogs: number;
  matchScore: number;
  matchStatus: MatchStatus;
  eligibilityStatus: EligibilityStatus;
  readinessScore: number;
  technicalScore: number;
  communicationScore: number;
  resumeScore: number;
  resumeReviewStatus: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  risks: string[];
  reasons: string[];
  calculatedAt: Date;
}

export interface CompanyMatchSummary {
  totalChecked: number;
  eligible: number;
  strongFit: number;
  goodFit: number;
  averageFit: number;
  riskFit: number;
  notEligible: number;
  notFit: number;
  lastCalculatedAt: Date | null;
}

export interface CompanyMatchFilters {
  search?: string;
  matchStatus?: MatchStatus;
  eligibilityStatus?: EligibilityStatus;
  branch?: string;
  batch?: string;
  minScore?: number;
  maxScore?: number;
  missingSkill?: string;
  page?: number;
  pageSize?: number;
}

export interface StudentCompanyMatchItem {
  id: string;
  companyRequirementId: string;
  companyId: string;
  companyName: string;
  roleTitle: string;
  matchScore: number;
  matchStatus: MatchStatus;
  eligibilityStatus: EligibilityStatus;
  missingSkills: string[];
  risks: string[];
  calculatedAt: Date;
}

export interface CompanyMatchingDashboardStats {
  activeRequirements: number;
  strongMatchesThisMonth: number;
  topMissingSkills: { skill: string; count: number }[];
}
