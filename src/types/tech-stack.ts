export type SkillCategory =
  | "PROGRAMMING_LANGUAGE"
  | "WEB_TECHNOLOGY"
  | "DATABASE"
  | "FRAMEWORK"
  | "TOOL"
  | "CLOUD"
  | "DATA_ANALYTICS"
  | "AI_ML"
  | "CYBERSECURITY"
  | "SOFT_SKILL"
  | "OTHER";

export type ProficiencyLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type VerificationStatus =
  | "SELF_DECLARED"
  | "FACULTY_VERIFIED"
  | "PERFORMANCE_VERIFIED"
  | "RESUME_EVIDENCE"
  | "GITHUB_EVIDENCE"
  | "NOT_VERIFIED";

export type InterestLevel = "LOW" | "MEDIUM" | "HIGH";

export type RoleReadinessLevel =
  | "NOT_READY"
  | "LEARNING"
  | "NEAR_READY"
  | "READY";

export interface TechSkillItem {
  id: string;
  name: string;
  category: SkillCategory;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentTechSkillItem {
  id: string;
  studentId: string;
  techSkillId: string;
  skillName: string;
  skillCategory: SkillCategory;
  proficiencyLevel: ProficiencyLevel;
  verificationStatus: VerificationStatus;
  evidenceSource: string | null;
  notes: string | null;
  addedByUserId: string;
  verifiedByUserId: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  addedByName?: string | null;
  verifiedByName?: string | null;
}

export interface StudentRoleInterestItem {
  id: string;
  studentId: string;
  roleName: string;
  interestLevel: InterestLevel;
  readinessLevel: RoleReadinessLevel;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentTechStackSummary {
  studentId: string;
  fullName: string;
  rollNumber: string;
  branch: string;
  batch: string;
  skillsCount: number;
  verifiedSkillsCount: number;
  topSkills: string[];
  roleInterests: string[];
  lastUpdated: Date | null;
}

export interface TechStackFilters {
  search?: string;
  branch?: string;
  batch?: string;
  techSkillId?: string;
  category?: SkillCategory;
  proficiencyLevel?: ProficiencyLevel;
  verificationStatus?: VerificationStatus;
  roleInterest?: string;
  page?: number;
  pageSize?: number;
}

export interface TechStackDashboardStats {
  studentsWithTechStack: number;
  avgVerifiedSkillsPerStudent: number;
  topSkills: { name: string; count: number }[];
  categoryDistribution: { category: SkillCategory; count: number }[];
}
