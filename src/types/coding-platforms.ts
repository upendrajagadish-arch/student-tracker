export type CodingProfileVerificationStatus =
  | "NOT_VERIFIED"
  | "PROFILE_LINKED"
  | "MANUALLY_VERIFIED"
  | "CSV_VERIFIED"
  | "PUBLIC_EVIDENCE"
  | "FACULTY_VERIFIED";

export type CodingProfileDataSource =
  | "MANUAL"
  | "CSV_IMPORT"
  | "PUBLIC_PROFILE"
  | "API"
  | "UNKNOWN";

export type CodingProfileSyncStatus =
  | "NOT_SYNCED"
  | "SYNCED"
  | "FAILED"
  | "UNSUPPORTED";

export interface CodingPlatformItem {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  isActive: boolean;
  supportsManualTracking: boolean;
  supportsCsvImport: boolean;
  supportsPublicProfile: boolean;
  notes: string | null;
}

export interface StudentCodingProfileItem {
  id: string;
  studentId: string;
  platformId: string;
  platformName: string;
  platformSlug: string;
  username: string | null;
  profileUrl: string | null;
  totalProblemsSolved: number;
  easySolved: number | null;
  mediumSolved: number | null;
  hardSolved: number | null;
  contestRating: number | null;
  globalRank: number | null;
  badges: string[];
  primaryLanguages: string[];
  lastActivityAt: string | null;
  verificationStatus: CodingProfileVerificationStatus;
  dataSource: CodingProfileDataSource;
  evidenceScore: number;
  consistencyScore: number;
  problemSolvingScore: number;
  profileStrengthScore: number;
  lastUpdatedByName: string | null;
  lastSyncedAt: string | null;
  syncStatus: CodingProfileSyncStatus;
  syncError: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CodingProfileOverviewItem {
  profileId: string;
  studentId: string;
  fullName: string;
  rollNumber: string;
  branch: string;
  batch: string;
  platformName: string;
  platformSlug: string;
  username: string | null;
  profileUrl: string | null;
  totalProblemsSolved: number;
  contestRating: number | null;
  globalRank: number | null;
  verificationStatus: CodingProfileVerificationStatus;
  dataSource: CodingProfileDataSource;
  evidenceScore: number;
  lastActivityAt: string | null;
}

export interface CodingProfileFilters {
  search?: string;
  branch?: string;
  batch?: string;
  platformId?: string;
  platformSlug?: string;
  verificationStatus?: CodingProfileVerificationStatus;
  dataSource?: CodingProfileDataSource;
  minEvidenceScore?: number;
  page?: number;
  pageSize?: number;
}

export interface CodingProfileOverviewResult {
  items: CodingProfileOverviewItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CodingDashboardStats {
  studentsWithCodingProfiles: number;
  avgCodingEvidenceScore: number;
  topPlatforms: { name: string; count: number }[];
  topProblemSolvers: {
    studentId: string;
    fullName: string;
    rollNumber: string;
    totalProblems: number;
    evidenceScore: number;
  }[];
  inactiveProfiles: number;
}

export interface CodingProfileImportRow {
  rollNumber?: string;
  email?: string;
  platform: string;
  username?: string;
  profileUrl?: string;
  totalProblemsSolved?: number;
  easySolved?: number;
  mediumSolved?: number;
  hardSolved?: number;
  contestRating?: number;
  globalRank?: number;
  lastActivityAt?: string;
  badges?: string;
  languages?: string;
}

export interface ParsedCodingImportRow {
  rowNumber: number;
  raw: Record<string, string>;
  data?: CodingProfileImportRow;
  errors: string[];
  status: "valid" | "invalid" | "update" | "unknown_student" | "unknown_platform";
  studentId?: string;
  platformId?: string;
  existingProfileId?: string;
}
