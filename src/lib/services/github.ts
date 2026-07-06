import { prisma } from "@/lib/db";
import {
  getGitHubConfig,
  getGitHubRateLimitWarning,
} from "@/lib/github-config";
import { logAudit } from "@/lib/services/audit";
import { triggerReadinessRecalculation } from "@/lib/services/readiness";
import type {
  GitHubDashboardStats,
  GitHubFilters,
  GitHubLanguageStat,
  GitHubOverviewItem,
  GitHubOverviewResult,
  GitHubProfileItem,
  GitHubRepositoryItem,
  GitHubSyncResult,
  GitHubSyncStatus,
} from "@/types/github";
import type { UserRole } from "@/types";
import type { GitHubProfile, GitHubRepository, Prisma } from "@prisma/client";

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public isRateLimited: boolean = false
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

interface GitHubApiUser {
  login: string;
  html_url: string;
  avatar_url: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

interface GitHubApiRepo {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  pushed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseJsonArray<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseGitHubUsername(
  input: string | null | undefined
): string | null {
  if (!input?.trim()) return null;

  const trimmed = input.trim();

  if (!trimmed.includes("/") && !trimmed.includes(".")) {
    return trimmed.replace(/^@/, "");
  }

  try {
    const url = trimmed.startsWith("http")
      ? new URL(trimmed)
      : new URL(`https://${trimmed}`);
    const host = url.hostname.replace(/^www\./, "");
    if (!host.endsWith("github.com")) return null;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;
    if (["orgs", "settings", "marketplace", "features"].includes(parts[0])) {
      return null;
    }
    return parts[0].replace(/^@/, "");
  } catch {
    const segment = trimmed.replace(/^@/, "").split("/")[0];
    return segment || null;
  }
}

async function githubFetch<T>(
  path: string,
  options?: { method?: string }
): Promise<{ data: T; rateLimitRemaining: number | null }> {
  const config = getGitHubConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "PlacementIQ-GitHub-Integration",
    };
    if (config.token) {
      headers.Authorization = `Bearer ${config.token}`;
    }

    const response = await fetch(`${config.baseUrl}${path}`, {
      method: options?.method ?? "GET",
      headers,
      signal: controller.signal,
      cache: "no-store",
    });

    const remainingHeader = response.headers.get("x-ratelimit-remaining");
    const rateLimitRemaining = remainingHeader
      ? Number(remainingHeader)
      : null;

    if (response.status === 403 || response.status === 429) {
      const isRateLimited =
        rateLimitRemaining === 0 ||
        response.status === 429 ||
        (await response.text()).toLowerCase().includes("rate limit");
      throw new GitHubApiError(
        isRateLimited
          ? "GitHub API rate limit exceeded. Try again later or configure GITHUB_TOKEN."
          : `GitHub API forbidden (${response.status})`,
        response.status,
        isRateLimited
      );
    }

    if (response.status === 404) {
      throw new GitHubApiError("GitHub user or resource not found", 404);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new GitHubApiError(
        `GitHub API error (${response.status}): ${body.slice(0, 200)}`,
        response.status
      );
    }

    if (response.status === 204) {
      return { data: {} as T, rateLimitRemaining };
    }

    const data = (await response.json()) as T;
    return { data, rateLimitRemaining };
  } catch (error) {
    if (error instanceof GitHubApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new GitHubApiError("GitHub API request timed out", 408);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchGitHubUser(username: string): Promise<GitHubApiUser> {
  const { data } = await githubFetch<GitHubApiUser>(
    `/users/${encodeURIComponent(username)}`
  );
  return data;
}

export async function fetchGitHubRepositories(
  username: string
): Promise<GitHubApiRepo[]> {
  const config = getGitHubConfig();
  const { data } = await githubFetch<GitHubApiRepo[]>(
    `/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=${config.syncRepoLimit}`
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchRepositoryLanguages(
  username: string,
  repo: string
): Promise<Record<string, number>> {
  const { data } = await githubFetch<Record<string, number>>(
    `/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}/languages`
  );
  return data ?? {};
}

export async function checkReadmeExists(
  username: string,
  repo: string
): Promise<boolean> {
  try {
    await githubFetch(`/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}/readme`);
    return true;
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) {
      return false;
    }
    throw error;
  }
}

function toLanguageStats(
  languages: Record<string, number>
): GitHubLanguageStat[] {
  const entries = Object.entries(languages);
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (total <= 0) return [];

  return entries
    .map(([name, bytes]) => ({
      name,
      bytes,
      percentage: Math.round((bytes / total) * 1000) / 10,
    }))
    .sort((a, b) => b.bytes - a.bytes);
}

function aggregateTopLanguages(
  repoLanguages: GitHubLanguageStat[][]
): GitHubLanguageStat[] {
  const totals = new Map<string, number>();
  for (const langs of repoLanguages) {
    for (const lang of langs) {
      totals.set(lang.name, (totals.get(lang.name) ?? 0) + lang.bytes);
    }
  }
  const totalBytes = [...totals.values()].reduce((a, b) => a + b, 0);
  if (totalBytes <= 0) return [];

  return [...totals.entries()]
    .map(([name, bytes]) => ({
      name,
      bytes,
      percentage: Math.round((bytes / totalBytes) * 1000) / 10,
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 8);
}

export function calculateRepoQualityScore(repo: {
  isFork: boolean;
  hasReadme: boolean;
  description: string | null;
  primaryLanguage: string | null;
  stars: number;
}): number {
  if (repo.isFork) return Math.min(40, 15 + repo.stars);

  let score = 30;
  if (repo.hasReadme) score += 25;
  if (repo.description?.trim()) score += 15;
  if (repo.primaryLanguage) score += 15;
  score += Math.min(15, repo.stars * 2);
  return clampScore(score);
}

export function calculateGitHubScores(
  repos: Array<{
    isFork: boolean;
    hasReadme: boolean;
    description: string | null;
    primaryLanguage: string | null;
    stars: number;
    lastPushedAt: Date | null;
    projectQualityScore: number;
  }>
): {
  activityScore: number;
  projectScore: number;
  consistencyScore: number;
  evidenceScore: number;
} {
  const now = Date.now();
  const owned = repos.filter((r) => !r.isFork);

  const pushDates = repos
    .map((r) => r.lastPushedAt?.getTime())
    .filter((t): t is number => t != null);

  let activityScore = 0;
  if (pushDates.length > 0) {
    const latest = Math.max(...pushDates);
    const daysSince = (now - latest) / (1000 * 60 * 60 * 24);
    if (daysSince <= 30) activityScore = 90;
    else if (daysSince <= 90) activityScore = 70;
    else if (daysSince <= 180) activityScore = 50;
    else if (daysSince <= 365) activityScore = 30;
    else activityScore = 15;
  }

  let projectScore = 0;
  if (owned.length > 0) {
    const avgQuality =
      owned.reduce((sum, r) => sum + r.projectQualityScore, 0) / owned.length;
    const diversityBonus = Math.min(20, owned.length * 4);
    projectScore = clampScore(avgQuality * 0.75 + diversityBonus);
  }

  const activeWithinYear = repos.filter((r) => {
    if (!r.lastPushedAt) return false;
    return now - r.lastPushedAt.getTime() < 365 * 24 * 60 * 60 * 1000;
  }).length;

  let consistencyScore = 10;
  if (activeWithinYear >= 4) consistencyScore = 85;
  else if (activeWithinYear === 3) consistencyScore = 70;
  else if (activeWithinYear === 2) consistencyScore = 55;
  else if (activeWithinYear === 1) consistencyScore = 35;

  const evidenceScore = clampScore(
    activityScore * 0.35 + projectScore * 0.4 + consistencyScore * 0.25
  );

  return {
    activityScore: clampScore(activityScore),
    projectScore: clampScore(projectScore),
    consistencyScore: clampScore(consistencyScore),
    evidenceScore,
  };
}

function mapRepository(
  repo: GitHubRepository
): GitHubRepositoryItem {
  return {
    id: repo.id,
    repoName: repo.repoName,
    repoUrl: repo.repoUrl,
    description: repo.description,
    primaryLanguage: repo.primaryLanguage,
    languages: parseJsonArray<GitHubLanguageStat[]>(repo.languagesJson, []),
    stars: repo.stars,
    forks: repo.forks,
    isFork: repo.isFork,
    hasReadme: repo.hasReadme,
    lastPushedAt: repo.lastPushedAt?.toISOString() ?? null,
    createdAtGithub: repo.createdAtGithub?.toISOString() ?? null,
    updatedAtGithub: repo.updatedAtGithub?.toISOString() ?? null,
    commitsCount: repo.commitsCount,
    projectQualityScore: repo.projectQualityScore,
  };
}

function mapProfile(
  profile: GitHubProfile & { repositories?: GitHubRepository[] }
): GitHubProfileItem {
  return {
    id: profile.id,
    studentId: profile.studentId,
    username: profile.username,
    profileUrl: profile.profileUrl,
    avatarUrl: profile.avatarUrl,
    publicRepos: profile.publicRepos,
    followers: profile.followers,
    following: profile.following,
    lastSyncedAt: profile.lastSyncedAt?.toISOString() ?? null,
    syncStatus: profile.syncStatus as GitHubSyncStatus,
    syncError: profile.syncError,
    activityScore: profile.activityScore,
    projectScore: profile.projectScore,
    consistencyScore: profile.consistencyScore,
    evidenceScore: profile.evidenceScore,
    topLanguages: parseJsonArray<GitHubLanguageStat[]>(
      profile.topLanguagesJson,
      []
    ),
    repositories: (profile.repositories ?? []).map(mapRepository),
    rateLimitWarning: getGitHubRateLimitWarning(),
  };
}

export async function getGitHubProfileForStudent(
  studentId: string
): Promise<GitHubProfileItem | null> {
  const profile = await prisma.gitHubProfile.findUnique({
    where: { studentId },
    include: { repositories: { orderBy: { lastPushedAt: "desc" } } },
  });
  return profile ? mapProfile(profile) : null;
}

export async function updateStudentGitHubUsername(
  studentId: string,
  usernameOrUrl: string,
  options?: { actorUserId?: string; actorRole?: UserRole }
): Promise<{ username: string; profileUrl: string }> {
  const username = parseGitHubUsername(usernameOrUrl);
  if (!username) {
    throw new Error("Invalid GitHub username or profile URL");
  }

  const profileUrl = `https://github.com/${username}`;

  await prisma.student.update({
    where: { id: studentId },
    data: { githubUrl: profileUrl },
  });

  await prisma.gitHubProfile.upsert({
    where: { studentId },
    create: {
      studentId,
      username,
      profileUrl,
      syncStatus: "NOT_SYNCED",
    },
    update: {
      username,
      profileUrl,
      syncStatus: "NOT_SYNCED",
      syncError: null,
    },
  });

  if (options?.actorUserId) {
    await logAudit({
      actorUserId: options.actorUserId,
      actorRole: options.actorRole ?? null,
      action: "GITHUB_USERNAME_UPDATED",
      entityType: "Student",
      entityId: studentId,
      description: `GitHub username updated to ${username}`,
    });
  }

  return { username, profileUrl };
}

export async function syncStudentGitHubProfile(
  studentId: string,
  options?: {
    actorUserId?: string;
    actorRole?: UserRole;
    skipReadinessRecalc?: boolean;
    skipAudit?: boolean;
  }
): Promise<GitHubSyncResult> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, fullName: true, githubUrl: true },
  });

  if (!student) {
    return {
      success: false,
      profile: null,
      syncStatus: "FAILED",
      error: "Student not found",
      rateLimitWarning: getGitHubRateLimitWarning(),
    };
  }

  const username =
    parseGitHubUsername(student.githubUrl) ??
    (
      await prisma.gitHubProfile.findUnique({
        where: { studentId },
        select: { username: true },
      })
    )?.username;

  if (!username) {
    const message = "No GitHub username or profile URL on student record";
    await prisma.gitHubProfile.upsert({
      where: { studentId },
      create: {
        studentId,
        username: "unknown",
        profileUrl: "",
        syncStatus: "FAILED",
        syncError: message,
      },
      update: {
        syncStatus: "FAILED",
        syncError: message,
      },
    });

    if (!options?.skipAudit && options?.actorUserId) {
      await logAudit({
        actorUserId: options.actorUserId,
        actorRole: options.actorRole ?? null,
        action: "GITHUB_SYNC_FAILED",
        entityType: "Student",
        entityId: studentId,
        description: `GitHub sync failed for ${student.fullName}: ${message}`,
      });
    }

    return {
      success: false,
      profile: await getGitHubProfileForStudent(studentId),
      syncStatus: "FAILED",
      error: message,
      rateLimitWarning: getGitHubRateLimitWarning(),
    };
  }

  try {
    const user = await fetchGitHubUser(username);
    const apiRepos = await fetchGitHubRepositories(username);

    const ownedRepos = apiRepos.filter((r) => !r.fork);
    const readmeCandidates = ownedRepos.slice(0, 8);
    const languageCandidates = ownedRepos.slice(0, 5);

    const readmeResults = new Map<string, boolean>();
    for (const repo of readmeCandidates) {
      readmeResults.set(
        repo.name,
        await checkReadmeExists(username, repo.name)
      );
      if (!getGitHubConfig().hasToken) {
        await delay(200);
      }
    }

    const repoLanguageMap = new Map<string, GitHubLanguageStat[]>();
    for (const repo of languageCandidates) {
      const langs = await fetchRepositoryLanguages(username, repo.name);
      repoLanguageMap.set(repo.name, toLanguageStats(langs));
      if (!getGitHubConfig().hasToken) {
        await delay(200);
      }
    }

    const repoRecords = apiRepos.map((repo) => {
      const languages = repoLanguageMap.get(repo.name) ?? [];
      const primaryLanguage =
        repo.language ?? languages[0]?.name ?? null;
      const hasReadme = readmeResults.get(repo.name) ?? false;
      const projectQualityScore = calculateRepoQualityScore({
        isFork: repo.fork,
        hasReadme,
        description: repo.description,
        primaryLanguage,
        stars: repo.stargazers_count,
      });

      return {
        repoName: repo.name,
        repoUrl: repo.html_url,
        description: repo.description,
        primaryLanguage,
        languagesJson:
          languages.length > 0 ? JSON.stringify(languages) : null,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        isFork: repo.fork,
        hasReadme,
        lastPushedAt: parseDate(repo.pushed_at),
        createdAtGithub: parseDate(repo.created_at),
        updatedAtGithub: parseDate(repo.updated_at),
        commitsCount: null,
        projectQualityScore,
      };
    });

    const scores = calculateGitHubScores(repoRecords);
    const topLanguages = aggregateTopLanguages(
      repoRecords.map((r) =>
        parseJsonArray<GitHubLanguageStat[]>(r.languagesJson, [])
      )
    );

    const profile = await prisma.$transaction(async (tx) => {
      const upserted = await tx.gitHubProfile.upsert({
        where: { studentId },
        create: {
          studentId,
          username: user.login,
          profileUrl: user.html_url,
          avatarUrl: user.avatar_url,
          publicRepos: user.public_repos,
          followers: user.followers,
          following: user.following,
          lastSyncedAt: new Date(),
          syncStatus: "SYNCED",
          syncError: null,
          activityScore: scores.activityScore,
          projectScore: scores.projectScore,
          consistencyScore: scores.consistencyScore,
          evidenceScore: scores.evidenceScore,
          topLanguagesJson: JSON.stringify(topLanguages),
        },
        update: {
          username: user.login,
          profileUrl: user.html_url,
          avatarUrl: user.avatar_url,
          publicRepos: user.public_repos,
          followers: user.followers,
          following: user.following,
          lastSyncedAt: new Date(),
          syncStatus: "SYNCED",
          syncError: null,
          activityScore: scores.activityScore,
          projectScore: scores.projectScore,
          consistencyScore: scores.consistencyScore,
          evidenceScore: scores.evidenceScore,
          topLanguagesJson: JSON.stringify(topLanguages),
        },
      });

      await tx.gitHubRepository.deleteMany({
        where: { githubProfileId: upserted.id },
      });

      if (repoRecords.length > 0) {
        await tx.gitHubRepository.createMany({
          data: repoRecords.map((r) => ({
            githubProfileId: upserted.id,
            ...r,
          })),
        });
      }

      if (!student.githubUrl) {
        await tx.student.update({
          where: { id: studentId },
          data: { githubUrl: user.html_url },
        });
      }

      return upserted;
    });

    if (!options?.skipAudit && options?.actorUserId) {
      await logAudit({
        actorUserId: options.actorUserId,
        actorRole: options.actorRole ?? null,
        action: "GITHUB_PROFILE_SYNCED",
        entityType: "Student",
        entityId: studentId,
        description: `GitHub profile synced for ${student.fullName} (@${profile.username}) — evidence score ${scores.evidenceScore}`,
      });
    }

    if (!options?.skipReadinessRecalc) {
      await triggerReadinessRecalculation(studentId);
    }

    const mapped = await getGitHubProfileForStudent(studentId);

    return {
      success: true,
      profile: mapped,
      syncStatus: "SYNCED",
      rateLimitWarning: getGitHubRateLimitWarning(),
    };
  } catch (error) {
    const isRateLimited =
      error instanceof GitHubApiError && error.isRateLimited;
    const message =
      error instanceof Error ? error.message : "GitHub sync failed";
    const syncStatus: GitHubSyncStatus = isRateLimited
      ? "RATE_LIMITED"
      : "FAILED";

    await prisma.gitHubProfile.upsert({
      where: { studentId },
      create: {
        studentId,
        username,
        profileUrl: `https://github.com/${username}`,
        syncStatus,
        syncError: message,
      },
      update: {
        username,
        profileUrl: `https://github.com/${username}`,
        syncStatus,
        syncError: message,
      },
    });

    if (!options?.skipAudit && options?.actorUserId) {
      await logAudit({
        actorUserId: options.actorUserId,
        actorRole: options.actorRole ?? null,
        action: "GITHUB_SYNC_FAILED",
        entityType: "Student",
        entityId: studentId,
        description: `GitHub sync failed for ${student.fullName}: ${message}`,
      });
    }

    return {
      success: false,
      profile: await getGitHubProfileForStudent(studentId),
      syncStatus,
      error: message,
      rateLimitWarning: getGitHubRateLimitWarning(),
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getGitHubOverview(
  filters: GitHubFilters = {}
): Promise<GitHubOverviewResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, filters.pageSize ?? 20));

  const where: Prisma.StudentWhereInput = {};
  if (filters.branch) where.branch = filters.branch;
  if (filters.batch) where.batch = filters.batch;
  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { fullName: { contains: q } },
      { rollNumber: { contains: q } },
    ];
  }

  const profileWhere: Prisma.GitHubProfileWhereInput = {};
  if (filters.syncStatus) profileWhere.syncStatus = filters.syncStatus;
  if (filters.minEvidenceScore != null) {
    profileWhere.evidenceScore = { gte: filters.minEvidenceScore };
  }
  if (filters.language?.trim()) {
    profileWhere.topLanguagesJson = {
      contains: `"name":"${filters.language.trim()}"`,
    };
  }

  if (Object.keys(profileWhere).length > 0) {
    where.githubProfile = profileWhere;
  }

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy: { fullName: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        githubProfile: {
          include: {
            repositories: {
              orderBy: { lastPushedAt: "desc" },
              take: 1,
              select: { lastPushedAt: true },
            },
          },
        },
      },
    }),
  ]);

  const items: GitHubOverviewItem[] = students.map((student) => {
    const profile = student.githubProfile;
    const topLanguages = profile
      ? parseJsonArray<GitHubLanguageStat[]>(profile.topLanguagesJson, [])
      : [];
    const lastActiveRepoAt =
      profile?.repositories[0]?.lastPushedAt?.toISOString() ??
      null;

    return {
      studentId: student.id,
      fullName: student.fullName,
      rollNumber: student.rollNumber,
      branch: student.branch,
      batch: student.batch,
      githubUrl: student.githubUrl,
      username: profile?.username ?? parseGitHubUsername(student.githubUrl),
      profileUrl: profile?.profileUrl ?? student.githubUrl,
      avatarUrl: profile?.avatarUrl ?? null,
      syncStatus: (profile?.syncStatus ?? "NOT_SYNCED") as GitHubSyncStatus,
      lastSyncedAt: profile?.lastSyncedAt?.toISOString() ?? null,
      evidenceScore: profile?.evidenceScore ?? 0,
      activityScore: profile?.activityScore ?? 0,
      topLanguages,
      lastActiveRepoAt,
      publicRepos: profile?.publicRepos ?? 0,
    };
  });

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getGitHubDashboardStats(): Promise<GitHubDashboardStats> {
  const [syncedProfiles, languageProfiles, recentRepos] = await Promise.all([
    prisma.gitHubProfile.findMany({
      where: { syncStatus: "SYNCED" },
      select: { evidenceScore: true, topLanguagesJson: true, studentId: true },
    }),
    prisma.gitHubProfile.findMany({
      where: { syncStatus: "SYNCED" },
      select: { topLanguagesJson: true },
    }),
    prisma.gitHubRepository.findMany({
      where: { lastPushedAt: { not: null } },
      orderBy: { lastPushedAt: "desc" },
      take: 20,
      select: {
        lastPushedAt: true,
        profile: {
          select: {
            evidenceScore: true,
            student: {
              select: { id: true, fullName: true, rollNumber: true },
            },
          },
        },
      },
    }),
  ]);

  const avgGitHubEvidenceScore =
    syncedProfiles.length > 0
      ? Math.round(
          (syncedProfiles.reduce((s, p) => s + p.evidenceScore, 0) /
            syncedProfiles.length) *
            10
        ) / 10
      : 0;

  const languageCounts = new Map<string, number>();
  for (const profile of languageProfiles) {
    const langs = parseJsonArray<GitHubLanguageStat[]>(
      profile.topLanguagesJson,
      []
    );
    for (const lang of langs.slice(0, 3)) {
      languageCounts.set(lang.name, (languageCounts.get(lang.name) ?? 0) + 1);
    }
  }

  const topGitHubLanguages = [...languageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  const seen = new Set<string>();
  const recentlyActiveStudents: GitHubDashboardStats["recentlyActiveStudents"] =
    [];

  for (const repo of recentRepos) {
    const studentId = repo.profile.student.id;
    if (seen.has(studentId) || !repo.lastPushedAt) continue;
    seen.add(studentId);
    recentlyActiveStudents.push({
      studentId,
      fullName: repo.profile.student.fullName,
      rollNumber: repo.profile.student.rollNumber,
      lastActiveRepoAt: repo.lastPushedAt.toISOString(),
      evidenceScore: repo.profile.evidenceScore,
    });
    if (recentlyActiveStudents.length >= 5) break;
  }

  return {
    studentsWithGitHubSynced: syncedProfiles.length,
    avgGitHubEvidenceScore,
    topGitHubLanguages,
    recentlyActiveStudents,
  };
}

export async function getGitHubLanguageMatchesForStudent(
  studentId: string
): Promise<string[]> {
  const [profile, techSkills] = await Promise.all([
    getGitHubProfileForStudent(studentId),
    prisma.studentTechSkill.findMany({
      where: { studentId },
      include: { techSkill: { select: { name: true } } },
    }),
  ]);

  if (!profile || profile.syncStatus !== "SYNCED") return [];

  const githubLangs = new Set(
    profile.topLanguages.map((l) => l.name.toLowerCase())
  );
  for (const repo of profile.repositories) {
    if (repo.primaryLanguage) {
      githubLangs.add(repo.primaryLanguage.toLowerCase());
    }
  }

  return techSkills
    .map((s) => s.techSkill.name)
    .filter((name) => githubLangs.has(name.toLowerCase()));
}

export async function syncGitHubBulkWithProgress(options: {
  studentIds: string[];
  actorUserId: string;
  actorRole: UserRole;
  onProgress?: (current: number, total: number) => Promise<void>;
}): Promise<{
  syncedCount: number;
  failedCount: number;
  rateLimitedCount: number;
}> {
  let syncedCount = 0;
  let failedCount = 0;
  let rateLimitedCount = 0;

  await logAudit({
    actorUserId: options.actorUserId,
    actorRole: options.actorRole,
    action: "GITHUB_BULK_SYNC_STARTED",
    entityType: "Job",
    description: `Bulk GitHub sync started for ${options.studentIds.length} students`,
  });

  for (let i = 0; i < options.studentIds.length; i++) {
    const studentId = options.studentIds[i];
    const result = await syncStudentGitHubProfile(studentId, {
      actorUserId: options.actorUserId,
      actorRole: options.actorRole,
      skipAudit: true,
      skipReadinessRecalc: true,
    });

    if (result.success) syncedCount += 1;
    else if (result.syncStatus === "RATE_LIMITED") rateLimitedCount += 1;
    else failedCount += 1;

    if (options.onProgress) {
      await options.onProgress(i + 1, options.studentIds.length);
    }

    if (!getGitHubConfig().hasToken) {
      await delay(1500);
    } else {
      await delay(300);
    }

    if (result.syncStatus === "RATE_LIMITED") break;
  }

  await logAudit({
    actorUserId: options.actorUserId,
    actorRole: options.actorRole,
    action: "GITHUB_BULK_SYNC_COMPLETED",
    entityType: "Job",
    description: `Bulk GitHub sync completed: ${syncedCount} synced, ${failedCount} failed, ${rateLimitedCount} rate limited`,
  });

  return { syncedCount, failedCount, rateLimitedCount };
}
