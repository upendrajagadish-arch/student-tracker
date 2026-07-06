export type HRAccessRole = "HR_VIEWER" | "HR_RECRUITER" | "HR_MANAGER";

export type ShareStatus =
  | "SHARED"
  | "VIEWED"
  | "SHORTLISTED"
  | "REJECTED"
  | "REVOKED"
  | "EXPIRED";

export type HRDecision =
  | "PENDING"
  | "INTERESTED"
  | "NOT_INTERESTED"
  | "SHORTLISTED"
  | "NEEDS_MORE_INFO";

export interface HRCompanyAccessItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  companyId: string;
  accessRole: HRAccessRole;
  isActive: boolean;
  createdAt: Date;
}

export interface HRUserListItem {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

export interface SharedStudentListItem {
  id: string;
  companyId: string;
  companyName: string;
  companyRequirementId: string;
  roleTitle: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  branch: string;
  batch: string;
  matchScore: number;
  matchStatus: string;
  readinessScore: number;
  shareStatus: ShareStatus;
  hrDecision: HRDecision;
  allowResumeDownload: boolean;
  allowPlacementPassport: boolean;
  sharedAt: Date;
  expiresAt: Date | null;
  sharedByName: string;
  sharedWithName: string | null;
  hasResume: boolean;
  keySkills: string[];
}

export interface SharedStudentFilters {
  companyId?: string;
  requirementId?: string;
  shareStatus?: ShareStatus;
  hrDecision?: HRDecision;
  branch?: string;
  batch?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface HrTalentRoomFilters {
  companyId?: string;
  requirementId?: string;
  matchStatus?: string;
  readinessStatus?: string;
  hrDecision?: HRDecision;
  branch?: string;
  skill?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface HrDashboardStats {
  assignedCompanies: { id: string; name: string }[];
  sharedStudentsCount: number;
  pendingReviewCount: number;
  interestedCount: number;
  shortlistedCount: number;
  recentlyShared: SharedStudentListItem[];
}

export interface HrSharedStudentDetail {
  share: {
    id: string;
    shareStatus: ShareStatus;
    hrDecision: HRDecision;
    hrComments: string | null;
    allowResumeDownload: boolean;
    allowPlacementPassport: boolean;
    sharedAt: Date;
    expiresAt: Date | null;
  };
  student: {
    id: string;
    fullName: string;
    rollNumber: string;
    email: string;
    phone: string | null;
    branch: string;
    batch: string;
    graduationYear: number;
    cgpa: number | null;
    activeBacklogs: number;
    linkedinUrl: string | null;
    githubUrl: string | null;
    technicalScore: number;
    communicationScore: number;
  };
  company: { id: string; name: string };
  requirement: { id: string; roleTitle: string };
  match: {
    matchScore: number;
    matchStatus: string;
    eligibilityStatus: string;
    matchedSkills: string[];
    missingSkills: string[];
    risks: string[];
  } | null;
  readiness: {
    overallScore: number;
    readinessStatus: string;
    riskLevel: string;
    technicalReadiness: number;
    communicationReadiness: number;
    resumeReadiness: number;
    techStackReadiness: number;
  } | null;
  resume: {
    id: string;
    reviewStatus: string;
    resumeScore: number;
    atsFriendly: boolean;
    originalFileName: string;
  } | null;
  techSkills: {
    name: string;
    proficiencyLevel: string;
    verificationStatus: string;
  }[];
  evidenceSummary: {
    verifiedSkills: string[];
    strongEvidenceSkills: string[];
    githubSummary: string | null;
    codingPlatformSummary: string | null;
  };
}
