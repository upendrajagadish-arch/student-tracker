export type GitHubSyncStatus =
  | "NOT_SYNCED"
  | "SYNCED"
  | "FAILED"
  | "RATE_LIMITED";

export interface GitHubLanguageStat {
  name: string;
  bytes: number;
  percentage: number;
}

export interface GitHubRepositoryItem {
  id: string;
  repoName: string;
  repoUrl: string;
  description: string | null;
  primaryLanguage: string | null;
  languages: GitHubLanguageStat[];
  stars: number;
  forks: number;
  isFork: boolean;
  hasReadme: boolean;
  lastPushedAt: string | null;
  createdAtGithub: string | null;
  updatedAtGithub: string | null;
  commitsCount: number | null;
  projectQualityScore: number | null;
}

export interface GitHubProfileItem {
  id: string;
  studentId: string;
  username: string;
  profileUrl: string;
  avatarUrl: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  lastSyncedAt: string | null;
  syncStatus: GitHubSyncStatus;
  syncError: string | null;
  activityScore: number;
  projectScore: number;
  consistencyScore: number;
  evidenceScore: number;
  topLanguages: GitHubLanguageStat[];
  repositories: GitHubRepositoryItem[];
  rateLimitWarning?: string | null;
}

export interface GitHubOverviewItem {
  studentId: string;
  fullName: string;
  rollNumber: string;
  branch: string;
  batch: string;
  githubUrl: string | null;
  username: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  syncStatus: GitHubSyncStatus;
  lastSyncedAt: string | null;
  evidenceScore: number;
  activityScore: number;
  topLanguages: GitHubLanguageStat[];
  lastActiveRepoAt: string | null;
  publicRepos: number;
}

export interface GitHubFilters {
  search?: string;
  branch?: string;
  batch?: string;
  syncStatus?: GitHubSyncStatus;
  language?: string;
  minEvidenceScore?: number;
  page?: number;
  pageSize?: number;
}

export interface GitHubOverviewResult {
  items: GitHubOverviewItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GitHubDashboardStats {
  studentsWithGitHubSynced: number;
  avgGitHubEvidenceScore: number;
  topGitHubLanguages: { name: string; count: number }[];
  recentlyActiveStudents: {
    studentId: string;
    fullName: string;
    rollNumber: string;
    lastActiveRepoAt: string;
    evidenceScore: number;
  }[];
}

export interface GitHubSyncResult {
  success: boolean;
  profile: GitHubProfileItem | null;
  syncStatus: GitHubSyncStatus;
  error?: string;
  rateLimitWarning?: string | null;
}

export interface GitHubBulkSyncJobResult {
  totalStudents: number;
  syncedCount: number;
  failedCount: number;
  rateLimitedCount: number;
  durationMs: number;
}
