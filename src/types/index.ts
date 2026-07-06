export type UserRole = "SUPER_ADMIN" | "TPO_ADMIN" | "FACULTY" | "HR";

export type PlacementStatus =
  | "NOT_STARTED"
  | "IN_TRAINING"
  | "READY"
  | "SHORTLISTED"
  | "PLACED"
  | "NEEDS_ATTENTION";

export type ResumeStatus =
  | "NOT_UPLOADED"
  | "UPLOADED"
  | "REVIEWED"
  | "APPROVED";

export type ResumeReviewStatus =
  | "NOT_UPLOADED"
  | "UPLOADED"
  | "UNDER_REVIEW"
  | "REVIEWED"
  | "NEEDS_IMPROVEMENT"
  | "APPROVED";

export interface ResumeItem {
  id: string;
  studentId: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  uploadedByUserId: string;
  reviewedByUserId: string | null;
  reviewStatus: ResumeReviewStatus;
  atsFriendly: boolean;
  resumeScore: number;
  hasLinkedIn: boolean;
  hasGitHub: boolean;
  hasProjects: boolean;
  hasCertifications: boolean;
  reviewerComments: string | null;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  uploadedByName?: string | null;
  reviewedByName?: string | null;
}

import type { ResumeInsightListMeta } from "@/types/resume-insights";

export interface ResumeListItem extends ResumeItem {
  studentName: string;
  rollNumber: string;
  branch: string;
  batch: string;
  insightMeta?: ResumeInsightListMeta | null;
}

export interface ResumeFilters {
  search?: string;
  branch?: string;
  batch?: string;
  reviewStatus?: ResumeReviewStatus;
  scoreMin?: number;
  scoreMax?: number;
  atsFriendly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
}

export interface StudentListItem {
  id: string;
  fullName: string;
  rollNumber: string;
  email: string;
  phone: string | null;
  branch: string;
  section: string | null;
  batch: string;
  graduationYear: number;
  cgpa: number | null;
  activeBacklogs: number;
  placementStatus: PlacementStatus;
  linkedinUrl: string | null;
  githubUrl: string | null;
  resumeStatus: ResumeStatus;
  technicalScore: number;
  communicationScore: number;
  readinessScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentFilters {
  search?: string;
  branch?: string;
  batch?: string;
  placementStatus?: PlacementStatus;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  totalStudents: number;
  placementReady: number;
  needsAttention: number;
  resumeUploaded: number;
  resumeApproved: number;
  avgResumeScore: number;
  avgTechnicalScore: number;
  avgCommunicationScore: number;
  studentsWithTechStack: number;
  avgVerifiedSkillsPerStudent: number;
  topSkills: { name: string; count: number }[];
  categoryDistribution: { category: string; count: number }[];
  readinessPlacementReady: number;
  readinessHighRisk: number;
  readinessAvgScore: number;
  readinessStatusDistribution: { status: string; count: number }[];
  readinessRiskDistribution: { risk: string; count: number }[];
  readinessTopGaps: { gap: string; count: number }[];
  activeCompanyRequirements: number;
  strongMatchesThisMonth: number;
  topMissingSkillsAcrossRequirements: { skill: string; count: number }[];
  studentsWithGitHubSynced: number;
  avgGitHubEvidenceScore: number;
  topGitHubLanguages: { name: string; count: number }[];
  recentlyActiveGitHubStudents: { fullName: string; rollNumber: string }[];
  studentsWithCodingProfiles: number;
  avgCodingEvidenceScore: number;
  topCodingPlatforms: { name: string; count: number }[];
  inactiveCodingProfiles: number;
  studentsWithStrongEvidence: number;
  topWeaklyEvidencedSkills: { skill: string; count: number }[];
  topVerifiedEvidenceSkills: { skill: string; count: number }[];
}

export interface StudentFormData {
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
  placementStatus?: PlacementStatus;
  linkedinUrl?: string;
  githubUrl?: string;
  resumeStatus?: ResumeStatus;
  technicalScore?: number;
  communicationScore?: number;
}
