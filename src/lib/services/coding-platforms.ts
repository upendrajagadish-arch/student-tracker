import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";
import { triggerReadinessRecalculation } from "@/lib/services/readiness";
import {
  CODING_PLATFORM_ALIASES,
  DEFAULT_CODING_PLATFORMS,
} from "@/lib/coding-platform-constants";
import type {
  CodingDashboardStats,
  CodingPlatformItem,
  CodingProfileFilters,
  CodingProfileOverviewItem,
  CodingProfileOverviewResult,
  CodingProfileDataSource,
  CodingProfileSyncStatus,
  CodingProfileVerificationStatus,
  StudentCodingProfileItem,
} from "@/types/coding-platforms";
import type { UserRole } from "@/types";
import type {
  CodingPlatform,
  Prisma,
  StudentCodingProfile,
} from "@prisma/client";

async function resolveSyncFields(platformSlug: string): Promise<{
  syncStatus: CodingProfileSyncStatus;
  syncError: string | null;
}> {
  const { getLiveSyncBlockReason } = await import(
    "@/lib/services/coding-live-sync"
  );
  const reason = await getLiveSyncBlockReason(platformSlug);
  if (reason) {
    return { syncStatus: "UNSUPPORTED", syncError: reason };
  }
  return { syncStatus: "NOT_SYNCED", syncError: null };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function normalizePlatformSlug(input: string): string {
  const key = input.trim().toLowerCase();
  return CODING_PLATFORM_ALIASES[key] ?? key.replace(/\s+/g, "-");
}

export async function ensureCodingPlatformsSeeded(): Promise<void> {
  for (const platform of DEFAULT_CODING_PLATFORMS) {
    await prisma.codingPlatform.upsert({
      where: { slug: platform.slug },
      create: {
        name: platform.name,
        slug: platform.slug,
        websiteUrl: platform.websiteUrl,
        supportsManualTracking: platform.supportsManualTracking,
        supportsCsvImport: platform.supportsCsvImport,
        supportsPublicProfile: platform.supportsPublicProfile,
        notes: "notes" in platform ? platform.notes ?? null : null,
      },
      update: {
        name: platform.name,
        websiteUrl: platform.websiteUrl,
        supportsManualTracking: platform.supportsManualTracking,
        supportsCsvImport: platform.supportsCsvImport,
        supportsPublicProfile: platform.supportsPublicProfile,
        notes: "notes" in platform ? platform.notes ?? null : null,
        isActive: true,
      },
    });
  }
}

export async function getActiveCodingPlatforms(): Promise<CodingPlatformItem[]> {
  await ensureCodingPlatformsSeeded();
  const rows = await prisma.codingPlatform.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return rows.map(mapPlatform);
}

function mapPlatform(row: CodingPlatform): CodingPlatformItem {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    websiteUrl: row.websiteUrl,
    isActive: row.isActive,
    supportsManualTracking: row.supportsManualTracking,
    supportsCsvImport: row.supportsCsvImport,
    supportsPublicProfile: row.supportsPublicProfile,
    notes: row.notes,
  };
}

type ScoreInput = {
  totalProblemsSolved: number;
  easySolved: number | null;
  mediumSolved: number | null;
  hardSolved: number | null;
  contestRating: number | null;
  globalRank: number | null;
  profileUrl: string | null;
  username: string | null;
  badgesJson: string;
  primaryLanguagesJson: string;
  lastActivityAt: Date | null;
  verificationStatus: CodingProfileVerificationStatus;
  platformSlug: string;
};

const VERIFICATION_MULTIPLIER: Record<CodingProfileVerificationStatus, number> = {
  NOT_VERIFIED: 0.45,
  PROFILE_LINKED: 0.6,
  MANUALLY_VERIFIED: 0.8,
  CSV_VERIFIED: 0.88,
  PUBLIC_EVIDENCE: 0.75,
  FACULTY_VERIFIED: 1,
};

const PLATFORM_WEIGHT: Record<string, number> = {
  leetcode: 1,
  codeforces: 1,
  codechef: 0.95,
  hackerrank: 0.9,
  hackerearth: 0.9,
  geeksforgeeks: 0.85,
  "coding-ninjas": 0.85,
  interviewbit: 0.85,
  other: 0.75,
};

export function calculateCodingScores(input: ScoreInput): {
  problemSolvingScore: number;
  consistencyScore: number;
  profileStrengthScore: number;
  evidenceScore: number;
} {
  const total = input.totalProblemsSolved ?? 0;
  const medium = input.mediumSolved ?? 0;
  const hard = input.hardSolved ?? 0;

  let problemSolving = 0;
  if (total > 0) {
    const weighted =
      total * 1.2 + medium * 2.5 + hard * 4;
    problemSolving = clampScore(Math.min(100, weighted));
  }

  let consistencyScore = 10;
  if (input.lastActivityAt) {
    const days =
      (Date.now() - input.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 14) consistencyScore = 95;
    else if (days <= 30) consistencyScore = 85;
    else if (days <= 90) consistencyScore = 65;
    else if (days <= 180) consistencyScore = 45;
    else if (days <= 365) consistencyScore = 25;
    else consistencyScore = 10;
  } else if (total > 0) {
    consistencyScore = 30;
  }

  let profileStrengthScore = 0;
  if (input.profileUrl?.trim() || input.username?.trim()) {
    profileStrengthScore += 30;
  }
  if (input.contestRating != null && input.contestRating > 0) {
    profileStrengthScore += Math.min(25, Math.round(input.contestRating / 80));
  }
  if (input.globalRank != null && input.globalRank > 0) {
    profileStrengthScore += Math.min(15, input.globalRank < 10000 ? 15 : 8);
  }
  const badges = parseJsonArray(input.badgesJson);
  const languages = parseJsonArray(input.primaryLanguagesJson);
  profileStrengthScore += Math.min(15, badges.length * 5);
  profileStrengthScore += Math.min(15, languages.length * 4);
  profileStrengthScore = clampScore(profileStrengthScore);

  const platformWeight = PLATFORM_WEIGHT[input.platformSlug] ?? 0.75;
  const verificationMultiplier =
    VERIFICATION_MULTIPLIER[input.verificationStatus] ?? 0.5;

  const rawEvidence =
    problemSolvingScoreFromParts(problemSolving, consistencyScore, profileStrengthScore) *
    platformWeight *
    verificationMultiplier;

  return {
    problemSolvingScore: problemSolving,
    consistencyScore: clampScore(consistencyScore),
    profileStrengthScore,
    evidenceScore: clampScore(rawEvidence),
  };
}

function problemSolvingScoreFromParts(
  problem: number,
  consistency: number,
  strength: number
): number {
  return problem * 0.5 + consistency * 0.25 + strength * 0.25;
}

function inferVerificationStatus(data: {
  verificationStatus?: CodingProfileVerificationStatus;
  profileUrl?: string | null;
  username?: string | null;
  dataSource: CodingProfileDataSource;
  totalProblemsSolved: number;
}): CodingProfileVerificationStatus {
  if (data.verificationStatus) return data.verificationStatus;
  if (data.dataSource === "CSV_IMPORT") return "CSV_VERIFIED";
  if ((data.profileUrl || data.username) && data.totalProblemsSolved > 0) {
    return "PROFILE_LINKED";
  }
  if (data.profileUrl || data.username) return "PROFILE_LINKED";
  return "NOT_VERIFIED";
}

function mapProfile(
  row: StudentCodingProfile & {
    platform: CodingPlatform;
    lastUpdatedBy?: { name: string } | null;
  }
): StudentCodingProfileItem {
  return {
    id: row.id,
    studentId: row.studentId,
    platformId: row.platformId,
    platformName: row.platform.name,
    platformSlug: row.platform.slug,
    username: row.username,
    profileUrl: row.profileUrl,
    totalProblemsSolved: row.totalProblemsSolved,
    easySolved: row.easySolved,
    mediumSolved: row.mediumSolved,
    hardSolved: row.hardSolved,
    contestRating: row.contestRating,
    globalRank: row.globalRank,
    badges: parseJsonArray(row.badgesJson),
    primaryLanguages: parseJsonArray(row.primaryLanguagesJson),
    lastActivityAt: row.lastActivityAt?.toISOString() ?? null,
    verificationStatus:
      row.verificationStatus as CodingProfileVerificationStatus,
    dataSource: row.dataSource as CodingProfileDataSource,
    evidenceScore: row.evidenceScore,
    consistencyScore: row.consistencyScore,
    problemSolvingScore: row.problemSolvingScore,
    profileStrengthScore: row.profileStrengthScore,
    lastUpdatedByName: row.lastUpdatedBy?.name ?? null,
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
    syncStatus: row.syncStatus as CodingProfileSyncStatus,
    syncError: row.syncError,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getStudentCodingProfiles(
  studentId: string
): Promise<StudentCodingProfileItem[]> {
  await ensureCodingPlatformsSeeded();
  const rows = await prisma.studentCodingProfile.findMany({
    where: { studentId },
    include: {
      platform: true,
      lastUpdatedBy: { select: { name: true } },
    },
    orderBy: [{ evidenceScore: "desc" }, { platform: { name: "asc" } }],
  });
  return rows.map(mapProfile);
}

export interface UpsertCodingProfileInput {
  platformId: string;
  username?: string | null;
  profileUrl?: string | null;
  totalProblemsSolved?: number;
  easySolved?: number | null;
  mediumSolved?: number | null;
  hardSolved?: number | null;
  contestRating?: number | null;
  globalRank?: number | null;
  badges?: string[];
  primaryLanguages?: string[];
  lastActivityAt?: string | null;
  verificationStatus?: CodingProfileVerificationStatus;
  dataSource?: CodingProfileDataSource;
  notes?: string | null;
}

export function buildProfileData(
  input: UpsertCodingProfileInput,
  platform: CodingPlatform,
  existing?: StudentCodingProfile | null
) {
  const dataSource =
    input.dataSource ??
    (existing?.dataSource as CodingProfileDataSource) ??
    "MANUAL";
  const totalProblemsSolved =
    input.totalProblemsSolved ?? existing?.totalProblemsSolved ?? 0;
  const verificationStatus =
    input.verificationStatus ??
    inferVerificationStatus({
      profileUrl: input.profileUrl ?? existing?.profileUrl,
      username: input.username ?? existing?.username,
      dataSource,
      totalProblemsSolved,
    });

  const badgesJson = JSON.stringify(
    input.badges ?? parseJsonArray(existing?.badgesJson)
  );
  const primaryLanguagesJson = JSON.stringify(
    input.primaryLanguages ?? parseJsonArray(existing?.primaryLanguagesJson)
  );

  const scores = calculateCodingScores({
    totalProblemsSolved,
    easySolved: input.easySolved ?? existing?.easySolved ?? null,
    mediumSolved: input.mediumSolved ?? existing?.mediumSolved ?? null,
    hardSolved: input.hardSolved ?? existing?.hardSolved ?? null,
    contestRating: input.contestRating ?? existing?.contestRating ?? null,
    globalRank: input.globalRank ?? existing?.globalRank ?? null,
    profileUrl: input.profileUrl ?? existing?.profileUrl ?? null,
    username: input.username ?? existing?.username ?? null,
    badgesJson,
    primaryLanguagesJson,
    lastActivityAt: parseDate(
      input.lastActivityAt ?? existing?.lastActivityAt ?? null
    ),
    verificationStatus,
    platformSlug: platform.slug,
  });

  return {
    username: input.username ?? existing?.username ?? null,
    profileUrl: input.profileUrl ?? existing?.profileUrl ?? null,
    totalProblemsSolved,
    easySolved: input.easySolved ?? existing?.easySolved ?? null,
    mediumSolved: input.mediumSolved ?? existing?.mediumSolved ?? null,
    hardSolved: input.hardSolved ?? existing?.hardSolved ?? null,
    contestRating: input.contestRating ?? existing?.contestRating ?? null,
    globalRank: input.globalRank ?? existing?.globalRank ?? null,
    badgesJson,
    primaryLanguagesJson,
    lastActivityAt: parseDate(
      input.lastActivityAt ?? existing?.lastActivityAt ?? null
    ),
    verificationStatus,
    dataSource,
    notes: input.notes !== undefined ? input.notes : existing?.notes ?? null,
    ...scores,
  };
}

export async function createStudentCodingProfile(
  studentId: string,
  input: UpsertCodingProfileInput,
  options?: { actorUserId?: string; actorRole?: UserRole }
): Promise<StudentCodingProfileItem> {
  await ensureCodingPlatformsSeeded();
  const platform = await prisma.codingPlatform.findUnique({
    where: { id: input.platformId },
  });
  if (!platform) throw new Error("Coding platform not found");

  const data = buildProfileData(input, platform);
  const syncFields = await resolveSyncFields(platform.slug);
  const row = await prisma.studentCodingProfile.create({
    data: {
      studentId,
      platformId: input.platformId,
      ...data,
      ...syncFields,
      lastUpdatedByUserId: options?.actorUserId ?? null,
    },
    include: {
      platform: true,
      lastUpdatedBy: { select: { name: true } },
    },
  });

  if (options?.actorUserId) {
    await logAudit({
      actorUserId: options.actorUserId,
      actorRole: options.actorRole ?? null,
      action: "CODING_PROFILE_ADDED",
      entityType: "Student",
      entityId: studentId,
      description: `Added ${platform.name} coding profile for student`,
    });
  }

  await triggerReadinessRecalculation(studentId);
  return mapProfile(row);
}

export async function updateStudentCodingProfile(
  profileId: string,
  input: UpsertCodingProfileInput,
  options?: { actorUserId?: string; actorRole?: UserRole }
): Promise<StudentCodingProfileItem> {
  const existing = await prisma.studentCodingProfile.findUnique({
    where: { id: profileId },
    include: { platform: true },
  });
  if (!existing) throw new Error("Coding profile not found");

  const platform = await prisma.codingPlatform.findUnique({
    where: { id: input.platformId ?? existing.platformId },
  });
  if (!platform) throw new Error("Coding platform not found");

  const data = buildProfileData(input, platform, existing);
  const syncFields = await resolveSyncFields(platform.slug);
  const row = await prisma.studentCodingProfile.update({
    where: { id: profileId },
    data: {
      ...data,
      ...syncFields,
      platformId: platform.id,
      lastUpdatedByUserId: options?.actorUserId ?? null,
    },
    include: {
      platform: true,
      lastUpdatedBy: { select: { name: true } },
    },
  });

  if (options?.actorUserId) {
    await logAudit({
      actorUserId: options.actorUserId,
      actorRole: options.actorRole ?? null,
      action: "CODING_PROFILE_UPDATED",
      entityType: "Student",
      entityId: existing.studentId,
      description: `Updated ${platform.name} coding profile`,
    });
  }

  await triggerReadinessRecalculation(existing.studentId);
  return mapProfile(row);
}

export async function deleteStudentCodingProfile(
  profileId: string,
  options?: { actorUserId?: string; actorRole?: UserRole }
): Promise<void> {
  const existing = await prisma.studentCodingProfile.findUnique({
    where: { id: profileId },
    include: { platform: true },
  });
  if (!existing) throw new Error("Coding profile not found");

  await prisma.studentCodingProfile.delete({ where: { id: profileId } });

  if (options?.actorUserId) {
    await logAudit({
      actorUserId: options.actorUserId,
      actorRole: options.actorRole ?? null,
      action: "CODING_PROFILE_REMOVED",
      entityType: "Student",
      entityId: existing.studentId,
      description: `Removed ${existing.platform.name} coding profile`,
    });
  }

  await triggerReadinessRecalculation(existing.studentId);
}

export async function verifyStudentCodingProfile(
  profileId: string,
  status: CodingProfileVerificationStatus,
  options?: { actorUserId?: string; actorRole?: UserRole }
): Promise<StudentCodingProfileItem> {
  const existing = await prisma.studentCodingProfile.findUnique({
    where: { id: profileId },
    include: { platform: true },
  });
  if (!existing) throw new Error("Coding profile not found");

  const scores = calculateCodingScores({
    totalProblemsSolved: existing.totalProblemsSolved,
    easySolved: existing.easySolved,
    mediumSolved: existing.mediumSolved,
    hardSolved: existing.hardSolved,
    contestRating: existing.contestRating,
    globalRank: existing.globalRank,
    profileUrl: existing.profileUrl,
    username: existing.username,
    badgesJson: existing.badgesJson,
    primaryLanguagesJson: existing.primaryLanguagesJson,
    lastActivityAt: existing.lastActivityAt,
    verificationStatus: status,
    platformSlug: existing.platform.slug,
  });

  const row = await prisma.studentCodingProfile.update({
    where: { id: profileId },
    data: {
      verificationStatus: status,
      ...scores,
      lastUpdatedByUserId: options?.actorUserId ?? null,
    },
    include: {
      platform: true,
      lastUpdatedBy: { select: { name: true } },
    },
  });

  if (options?.actorUserId) {
    await logAudit({
      actorUserId: options.actorUserId,
      actorRole: options.actorRole ?? null,
      action: "CODING_PROFILE_VERIFIED",
      entityType: "Student",
      entityId: existing.studentId,
      description: `Coding profile marked ${status} (${existing.platform.name})`,
    });
  }

  await triggerReadinessRecalculation(existing.studentId);
  return mapProfile(row);
}

export async function getCodingProfileOverview(
  filters: CodingProfileFilters = {}
): Promise<CodingProfileOverviewResult> {
  await ensureCodingPlatformsSeeded();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, filters.pageSize ?? 20));

  const studentWhere: Prisma.StudentWhereInput = {};
  if (filters.branch) studentWhere.branch = filters.branch;
  if (filters.batch) studentWhere.batch = filters.batch;
  if (filters.search?.trim()) {
    const q = filters.search.trim();
    studentWhere.OR = [
      { fullName: { contains: q } },
      { rollNumber: { contains: q } },
    ];
  }

  const profileWhere: Prisma.StudentCodingProfileWhereInput = {};
  if (filters.platformId) profileWhere.platformId = filters.platformId;
  if (filters.verificationStatus) {
    profileWhere.verificationStatus = filters.verificationStatus;
  }
  if (filters.dataSource) profileWhere.dataSource = filters.dataSource;
  if (filters.minEvidenceScore != null) {
    profileWhere.evidenceScore = { gte: filters.minEvidenceScore };
  }
  if (filters.platformSlug) {
    profileWhere.platform = { slug: filters.platformSlug };
  }
  if (Object.keys(studentWhere).length > 0) {
    profileWhere.student = studentWhere;
  }

  const [total, rows] = await Promise.all([
    prisma.studentCodingProfile.count({ where: profileWhere }),
    prisma.studentCodingProfile.findMany({
      where: profileWhere,
      include: {
        platform: true,
        student: {
          select: {
            id: true,
            fullName: true,
            rollNumber: true,
            branch: true,
            batch: true,
          },
        },
      },
      orderBy: [{ evidenceScore: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items: CodingProfileOverviewItem[] = rows.map((row) => ({
    profileId: row.id,
    studentId: row.student.id,
    fullName: row.student.fullName,
    rollNumber: row.student.rollNumber,
    branch: row.student.branch,
    batch: row.student.batch,
    platformName: row.platform.name,
    platformSlug: row.platform.slug,
    username: row.username,
    profileUrl: row.profileUrl,
    totalProblemsSolved: row.totalProblemsSolved,
    contestRating: row.contestRating,
    globalRank: row.globalRank,
    verificationStatus:
      row.verificationStatus as CodingProfileVerificationStatus,
    dataSource: row.dataSource as CodingProfileDataSource,
    evidenceScore: row.evidenceScore,
    lastActivityAt: row.lastActivityAt?.toISOString() ?? null,
  }));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getCodingDashboardStats(): Promise<CodingDashboardStats> {
  const profiles = await prisma.studentCodingProfile.findMany({
    include: {
      platform: { select: { name: true } },
      student: { select: { id: true, fullName: true, rollNumber: true } },
    },
  });

  const studentIds = new Set(profiles.map((p) => p.studentId));
  const now = Date.now();
  const inactiveThreshold = 180 * 24 * 60 * 60 * 1000;

  const platformCounts = new Map<string, number>();
  const studentTotals = new Map<
    string,
    { fullName: string; rollNumber: string; total: number; evidence: number }
  >();

  let evidenceSum = 0;
  let inactiveProfiles = 0;

  for (const p of profiles) {
    platformCounts.set(
      p.platform.name,
      (platformCounts.get(p.platform.name) ?? 0) + 1
    );
    evidenceSum += p.evidenceScore;

    const entry = studentTotals.get(p.studentId) ?? {
      fullName: p.student.fullName,
      rollNumber: p.student.rollNumber,
      total: 0,
      evidence: 0,
    };
    entry.total += p.totalProblemsSolved;
    entry.evidence = Math.max(entry.evidence, p.evidenceScore);
    studentTotals.set(p.studentId, entry);

    if (
      !p.lastActivityAt ||
      now - p.lastActivityAt.getTime() > inactiveThreshold
    ) {
      inactiveProfiles += 1;
    }
  }

  const topPlatforms = [...platformCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  const topProblemSolvers = [...studentTotals.entries()]
    .map(([studentId, v]) => ({
      studentId,
      fullName: v.fullName,
      rollNumber: v.rollNumber,
      totalProblems: v.total,
      evidenceScore: v.evidence,
    }))
    .sort((a, b) => b.totalProblems - a.totalProblems)
    .slice(0, 5);

  return {
    studentsWithCodingProfiles: studentIds.size,
    avgCodingEvidenceScore:
      profiles.length > 0
        ? Math.round((evidenceSum / profiles.length) * 10) / 10
        : 0,
    topPlatforms,
    topProblemSolvers,
    inactiveProfiles,
  };
}

const VERIFIED_CODING_STATUSES = new Set<CodingProfileVerificationStatus>([
  "MANUALLY_VERIFIED",
  "CSV_VERIFIED",
  "FACULTY_VERIFIED",
  "PUBLIC_EVIDENCE",
]);

export async function getStudentCodingReadinessSignal(studentId: string): Promise<{
  hasVerifiedCodingProfile: boolean;
  maxCodingEvidenceScore: number;
  profilesLinked: number;
}> {
  const profiles = await prisma.studentCodingProfile.findMany({
    where: { studentId },
    select: { evidenceScore: true, verificationStatus: true },
  });

  if (profiles.length === 0) {
    return {
      hasVerifiedCodingProfile: false,
      maxCodingEvidenceScore: 0,
      profilesLinked: 0,
    };
  }

  const maxCodingEvidenceScore = Math.max(
    ...profiles.map((p) => p.evidenceScore)
  );
  const hasVerifiedCodingProfile = profiles.some((p) =>
    VERIFIED_CODING_STATUSES.has(
      p.verificationStatus as CodingProfileVerificationStatus
    )
  );

  return {
    hasVerifiedCodingProfile,
    maxCodingEvidenceScore,
    profilesLinked: profiles.length,
  };
}

export async function getStudentCodingExportSummary(studentId: string): Promise<{
  profilesLinked: number;
  topPlatform: string;
  totalProblemsSolved: number;
  codingEvidenceScore: number;
  codingVerificationStatus: string;
}> {
  const profiles = await getStudentCodingProfiles(studentId);
  if (profiles.length === 0) {
    return {
      profilesLinked: 0,
      topPlatform: "—",
      totalProblemsSolved: 0,
      codingEvidenceScore: 0,
      codingVerificationStatus: "—",
    };
  }

  const top = profiles[0];
  const totalProblemsSolved = profiles.reduce(
    (sum, p) => sum + p.totalProblemsSolved,
    0
  );
  const bestVerified = profiles.find((p) =>
    VERIFIED_CODING_STATUSES.has(p.verificationStatus)
  );

  return {
    profilesLinked: profiles.length,
    topPlatform: top.platformName,
    totalProblemsSolved,
    codingEvidenceScore: Math.max(...profiles.map((p) => p.evidenceScore)),
    codingVerificationStatus: bestVerified
      ? bestVerified.verificationStatus
      : top.verificationStatus,
  };
}

export function detectCodingPlatformsInText(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  const patterns: [RegExp, string][] = [
    [/leetcode/i, "LeetCode"],
    [/hackerrank/i, "HackerRank"],
    [/hackerearth/i, "HackerEarth"],
    [/codechef/i, "CodeChef"],
    [/geeksforgeeks|geeks for geeks|\bgfg\b/i, "GeeksforGeeks"],
    [/codeforces/i, "Codeforces"],
    [/coding ninjas/i, "Coding Ninjas"],
    [/interviewbit|interview bit/i, "InterviewBit"],
    [/competitive programming/i, "Competitive Programming"],
    [/coding profile/i, "Coding Profile"],
  ];
  for (const [pattern, label] of patterns) {
    if (pattern.test(lower)) found.push(label);
  }
  return [...new Set(found)];
}

export async function getCodingEvidenceForResumeTruth(studentId: string): Promise<{
  profiles: StudentCodingProfileItem[];
  platformNames: string[];
  hasStrongEvidence: boolean;
  totalProblems: number;
}> {
  const profiles = await getStudentCodingProfiles(studentId);
  const platformNames = profiles.map((p) => p.platformName);
  const totalProblems = profiles.reduce(
    (sum, p) => sum + p.totalProblemsSolved,
    0
  );
  const hasStrongEvidence = profiles.some(
    (p) =>
      p.evidenceScore >= 40 &&
      VERIFIED_CODING_STATUSES.has(p.verificationStatus)
  );
  return { profiles, platformNames, hasStrongEvidence, totalProblems };
}
