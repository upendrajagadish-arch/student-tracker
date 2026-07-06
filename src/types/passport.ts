import type { EligibilityStatus, MatchStatus } from "@/types/company";
import type { ReadinessStatus, RiskLevel } from "@/types/readiness";
import type { HRDecision } from "@/types/sharing";

export interface PassportStudentSummary {
  fullName: string;
  rollNumber: string;
  branch: string;
  batch: string;
  graduationYear: number;
  email: string;
  phone: string | null;
}

export interface PassportReadinessSummary {
  overallScore: number;
  readinessStatus: ReadinessStatus;
  riskLevel: RiskLevel;
  technicalReadiness: number;
  communicationReadiness: number;
  resumeReadiness: number;
  techStackReadiness: number;
  profileReadiness: number;
  academicReadiness: number;
  nextRecommendedAction: string;
}

export interface PassportCompanyFit {
  companyName: string;
  roleTitle: string;
  matchScore: number;
  matchStatus: MatchStatus;
  eligibilityStatus: EligibilityStatus;
  matchedSkills: string[];
  missingSkills: string[];
  risks: string[];
  strengths: string[];
}

export interface PassportSkillItem {
  name: string;
  category: string;
  proficiencyLevel: string;
  verificationStatus: string;
  evidenceSource: string | null;
}

export interface PassportEvidenceSummary {
  topVerifiedSkills: string[];
  strongEvidenceSkills: string[];
  skillsNeedingProof: string[];
  companyFitEvidence?: {
    roleTitle: string;
    verifiedMatching: string[];
    missingRequired: string[];
  };
}

export interface PassportResumeSummary {
  reviewStatus: string;
  resumeScore: number;
  atsFriendly: boolean;
  hasLinkedIn: boolean;
  hasGitHub: boolean;
  hasProjects: boolean;
  hasCertifications: boolean;
}

export interface PassportAcademicSummary {
  cgpa: number | null;
  activeBacklogs: number;
  graduationYear: number;
  branch: string;
  batch: string;
}

export interface PassportRecommendations {
  nextRecommendedAction: string;
  strengths: string[];
  risks: string[];
}

export interface PassportHrContext {
  hrDecision: HRDecision;
  hrComments: string | null;
  sharedAt: string;
}

export interface PassportSummaryJson {
  student: PassportStudentSummary;
  readiness: PassportReadinessSummary;
  company?: PassportCompanyFit;
  roleInterests: string[];
  hr?: PassportHrContext;
}

export interface PlacementPassportView {
  id: string;
  studentId: string;
  passportTitle: string;
  generatedAt: Date;
  generatedByName: string;
  summary: PassportSummaryJson;
  skills: PassportSkillItem[];
  resume: PassportResumeSummary | null;
  academic: PassportAcademicSummary;
  strengths: string[];
  risks: string[];
  recommendations: PassportRecommendations;
  companyMatchScore: number | null;
  companyMatchStatus: MatchStatus | null;
  eligibilityStatus: EligibilityStatus | null;
  showHrBlock: boolean;
  evidence?: PassportEvidenceSummary;
}

export interface GeneratePassportOptions {
  studentId: string;
  generatedByUserId: string;
  companyId?: string | null;
  companyRequirementId?: string | null;
  sharedStudentProfileId?: string | null;
}
