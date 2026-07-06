export type ResumeInsightProvider = "openai" | "rules";

export type ResumeInsightReviewStatus =
  | "GENERATED"
  | "REVIEWED"
  | "APPLIED"
  | "DISMISSED";

export interface RoleSuitabilityItem {
  role: string;
  fit: "strong" | "moderate" | "weak";
  reason: string;
}

export interface ResumeInsightAnalysis {
  detectedSkills: string[];
  possibleMissingSkills: string[];
  missingSections: string[];
  atsIssues: string[];
  improvementSuggestions: string[];
  roleSuitability: RoleSuitabilityItem[];
  linkedInDetected: boolean;
  githubDetected: boolean;
  projectsDetected: boolean;
  certificationsDetected: boolean;
  atsFriendlyEstimate: boolean;
  suggestedResumeScore: number | null;
  confidenceScore: number;
  resumeTruthWarnings: string[];
  summary: string;
  provider: ResumeInsightProvider;
  aiEnabled: boolean;
}

export interface ResumeInsightRecord {
  id: string;
  resumeId: string;
  studentId: string;
  provider: ResumeInsightProvider;
  confidenceScore: number;
  detectedSkills: string[];
  possibleMissingSkills: string[];
  missingSections: string[];
  atsIssues: string[];
  improvementSuggestions: string[];
  roleSuitability: RoleSuitabilityItem[];
  resumeTruthWarnings: string[];
  summary: string | null;
  linkedInDetected: boolean;
  githubDetected: boolean;
  projectsDetected: boolean;
  certificationsDetected: boolean;
  atsFriendlyEstimate: boolean;
  suggestedResumeScore: number | null;
  reviewedByUserId: string | null;
  reviewStatus: ResumeInsightReviewStatus;
  appliedToResumeReview: boolean;
  aiEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResumeInsightListMeta {
  insightId: string | null;
  hasInsight: boolean;
  suggestedResumeScore: number | null;
  atsIssuesCount: number;
  provider: ResumeInsightProvider | null;
  reviewStatus: ResumeInsightReviewStatus | null;
}
