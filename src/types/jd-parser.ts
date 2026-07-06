export type JdParseProvider = "openai" | "rules";

export interface JDParseDraft {
  companyName: string | null;
  roleTitle: string | null;
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
}

export interface JDParseResult {
  draft: JDParseDraft;
  confidenceScore: number;
  warnings: string[];
  missingInfo: string[];
  provider: JdParseProvider;
  aiEnabled: boolean;
}

export interface ParseJdRequest {
  jdText: string;
  companyId?: string;
  companyName?: string;
  roleHint?: string;
}
