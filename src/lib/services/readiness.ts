import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { READINESS_WEIGHTS } from "@/lib/readiness-constants";
import { VERIFIED_STATUSES } from "@/lib/tech-constants";
import type { PaginatedResult } from "@/types";
import type {
  ReadinessDashboardStats,
  ReadinessFilters,
  ReadinessOverviewItem,
  ReadinessSnapshotItem,
  ReadinessStatus,
  RiskLevel,
  ScoreBreakdown,
} from "@/types/readiness";
import type { ProficiencyLevel, RoleReadinessLevel, VerificationStatus } from "@/types/tech-stack";

export interface ReadinessInputData {
  technicalScore: number;
  communicationScore: number;
  cgpa: number | null;
  activeBacklogs: number;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  githubSynced?: boolean;
  hasVerifiedCodingProfile?: boolean;
  maxCodingEvidenceScore?: number;
  resume: {
    resumeScore: number;
    atsFriendly: boolean;
    hasLinkedIn: boolean;
    hasGitHub: boolean;
    hasProjects: boolean;
    hasCertifications: boolean;
  } | null;
  techSkills: {
    proficiencyLevel: ProficiencyLevel;
    verificationStatus: VerificationStatus;
  }[];
  roleInterests: { readinessLevel: RoleReadinessLevel }[];
}

export function calculateTechnicalReadiness(
  technicalScore: number,
  codingBonus = 0
): number {
  return clampScore(Math.min(100, (technicalScore ?? 0) + codingBonus));
}

export function calculateCommunicationReadiness(
  communicationScore: number
): number {
  return clampScore(communicationScore ?? 0);
}

export function calculateResumeReadiness(
  resume: ReadinessInputData["resume"]
): number {
  if (!resume) return 0;

  let score = 0;
  score += clampScore(resume.resumeScore) * 0.6;
  if (resume.atsFriendly) score += 10;
  if (resume.hasLinkedIn) score += 10;
  if (resume.hasGitHub) score += 10;
  if (resume.hasProjects) score += 5;
  if (resume.hasCertifications) score += 5;

  return clampScore(score);
}

export function calculateTechStackReadiness(
  techSkills: ReadinessInputData["techSkills"],
  roleInterests: ReadinessInputData["roleInterests"]
): number {
  let score = 0;

  const skillCount = techSkills.length;
  score += Math.min(skillCount * 5, 35);

  const verifiedCount = techSkills.filter((s) =>
    VERIFIED_STATUSES.includes(s.verificationStatus)
  ).length;
  score += Math.min(verifiedCount * 8, 25);

  const intermediateCount = techSkills.filter(
    (s) => s.proficiencyLevel === "INTERMEDIATE"
  ).length;
  const advancedCount = techSkills.filter(
    (s) => s.proficiencyLevel === "ADVANCED"
  ).length;
  score += Math.min(intermediateCount * 4 + advancedCount * 8, 20);

  if (roleInterests.length > 0) score += 10;

  const readinessRank: Record<RoleReadinessLevel, number> = {
    NOT_READY: 0,
    LEARNING: 4,
    NEAR_READY: 7,
    READY: 10,
  };
  const bestRoleBonus = roleInterests.reduce(
    (max, r) => Math.max(max, readinessRank[r.readinessLevel]),
    0
  );
  score += bestRoleBonus;

  return clampScore(score);
}

export function calculateProfileReadiness(data: {
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  hasResume: boolean;
  hasTechStack: boolean;
  hasRoleInterest: boolean;
  githubSynced?: boolean;
  hasVerifiedCodingProfile?: boolean;
  maxCodingEvidenceScore?: number;
}): { score: number; checks: Record<string, boolean> } {
  const checks = {
    email: Boolean(data.email?.trim()),
    phone: Boolean(data.phone?.trim()),
    linkedin: Boolean(data.linkedinUrl?.trim()),
    github: Boolean(data.githubUrl?.trim()),
    resumeUploaded: data.hasResume,
    techStackAdded: data.hasTechStack,
    roleInterestAdded: data.hasRoleInterest,
  };

  const itemScore = 100 / 7;
  let score = Object.values(checks).filter(Boolean).length * itemScore;

  if (data.githubSynced && checks.github) {
    score = Math.min(100, score + itemScore * 0.5);
  }

  if (data.hasVerifiedCodingProfile && (data.maxCodingEvidenceScore ?? 0) >= 30) {
    score = Math.min(100, score + itemScore * 0.25);
  }

  return { score: clampScore(score), checks };
}

export function calculateAcademicReadiness(
  cgpa: number | null,
  activeBacklogs: number
): number {
  if (activeBacklogs > 0) {
    return clampScore(Math.max(0, 50 - activeBacklogs * 20));
  }

  if (cgpa == null) return 40;
  if (cgpa >= 7.5) return 95;
  if (cgpa >= 6.0) return 75;
  if (cgpa >= 5.0) return 55;
  return 35;
}

export function calculateOverallReadiness(components: {
  technicalReadiness: number;
  communicationReadiness: number;
  resumeReadiness: number;
  techStackReadiness: number;
  profileReadiness: number;
  academicReadiness: number;
}): number {
  const overall =
    components.technicalReadiness * READINESS_WEIGHTS.technical +
    components.communicationReadiness * READINESS_WEIGHTS.communication +
    components.resumeReadiness * READINESS_WEIGHTS.resume +
    components.techStackReadiness * READINESS_WEIGHTS.techStack +
    components.profileReadiness * READINESS_WEIGHTS.profile +
    components.academicReadiness * READINESS_WEIGHTS.academic;

  return roundScore(overall);
}

export function identifyCriticalGaps(data: {
  hasResume: boolean;
  communicationScore: number;
  technicalScore: number;
  activeBacklogs: number;
  hasTechStack: boolean;
}): string[] {
  const gaps: string[] = [];
  if (!data.hasResume) gaps.push("No resume uploaded");
  if (data.communicationScore < 40) gaps.push("Communication score below 40");
  if (data.technicalScore < 40) gaps.push("Technical score below 40");
  if (data.activeBacklogs > 0) gaps.push("Active backlogs present");
  if (!data.hasTechStack) gaps.push("No tech stack added");
  return gaps;
}

export function deriveReadinessStatus(overallScore: number): ReadinessStatus {
  if (overallScore >= 85) return "HIGHLY_READY";
  if (overallScore >= 75) return "PLACEMENT_READY";
  if (overallScore >= 60) return "NEAR_READY";
  if (overallScore >= 40) return "NEEDS_IMPROVEMENT";
  return "NOT_READY";
}

export function deriveRiskLevel(
  overallScore: number,
  criticalGaps: string[]
): RiskLevel {
  let base: RiskLevel;
  if (overallScore >= 75) base = "LOW";
  else if (overallScore >= 60) base = "MEDIUM";
  else if (overallScore >= 40) base = "HIGH";
  else base = "CRITICAL";

  const gapCount = criticalGaps.length;
  if (gapCount >= 3) return escalateRisk(escalateRisk(base));
  if (gapCount >= 2) return escalateRisk(base);
  if (gapCount >= 1 && overallScore < 75) return escalateRisk(base);

  if (overallScore >= 75 && gapCount === 0) return "LOW";
  if (overallScore >= 75 && gapCount > 0) return "MEDIUM";

  return base;
}

export function deriveNextRecommendedAction(input: {
  overallScore: number;
  criticalGaps: string[];
  hasResume: boolean;
  activeBacklogs: number;
  technicalScore: number;
  communicationScore: number;
  hasTechStack: boolean;
  linkedinUrl: string | null;
  githubUrl: string | null;
}): string {
  if (input.overallScore >= 75 && input.criticalGaps.length === 0) {
    return "Student is placement-ready; proceed for company matching.";
  }

  if (!input.hasResume) {
    return "Upload and review resume before company sharing.";
  }

  if (input.activeBacklogs > 0) {
    return "Clear active backlogs before placement eligibility.";
  }

  if (input.technicalScore < 40) {
    return "Improve technical score before applying to developer roles.";
  }

  if (input.communicationScore < 40) {
    return "Improve communication score through mock interview.";
  }

  if (!input.hasTechStack) {
    return "Add and verify core technical skills.";
  }

  if (!input.linkedinUrl || !input.githubUrl) {
    return "Add GitHub and LinkedIn profile links.";
  }

  if (input.overallScore >= 60) {
    return "Continue improving weak areas to reach placement-ready status.";
  }

  return "Complete profile, resume, and skill verification to improve readiness.";
}

export function computeReadinessFromData(
  data: ReadinessInputData
): {
  overallScore: number;
  technicalReadiness: number;
  communicationReadiness: number;
  resumeReadiness: number;
  techStackReadiness: number;
  profileReadiness: number;
  academicReadiness: number;
  riskLevel: RiskLevel;
  readinessStatus: ReadinessStatus;
  nextRecommendedAction: string;
  scoreBreakdown: ScoreBreakdown;
} {
  const technicalReadiness = calculateTechnicalReadiness(
    data.technicalScore,
    data.hasVerifiedCodingProfile && (data.maxCodingEvidenceScore ?? 0) >= 40
      ? Math.min(5, (data.maxCodingEvidenceScore ?? 0) * 0.05)
      : 0
  );
  const communicationReadiness = calculateCommunicationReadiness(
    data.communicationScore
  );
  const resumeReadiness = calculateResumeReadiness(data.resume);
  const techStackReadiness = calculateTechStackReadiness(
    data.techSkills,
    data.roleInterests
  );

  const hasResume = data.resume !== null;
  const hasTechStack = data.techSkills.length > 0;
  const hasRoleInterest = data.roleInterests.length > 0;

  const profile = calculateProfileReadiness({
    email: data.email,
    phone: data.phone,
    linkedinUrl: data.linkedinUrl,
    githubUrl: data.githubUrl,
    hasResume,
    hasTechStack,
    hasRoleInterest,
    githubSynced: data.githubSynced,
    hasVerifiedCodingProfile: data.hasVerifiedCodingProfile,
    maxCodingEvidenceScore: data.maxCodingEvidenceScore,
  });

  const academicReadiness = calculateAcademicReadiness(
    data.cgpa,
    data.activeBacklogs
  );

  const components = {
    technicalReadiness,
    communicationReadiness,
    resumeReadiness,
    techStackReadiness,
    profileReadiness: profile.score,
    academicReadiness,
  };

  const overallScore = calculateOverallReadiness(components);

  const criticalGaps = identifyCriticalGaps({
    hasResume,
    communicationScore: data.communicationScore,
    technicalScore: data.technicalScore,
    activeBacklogs: data.activeBacklogs,
    hasTechStack,
  });

  const readinessStatus = deriveReadinessStatus(overallScore);
  const riskLevel = deriveRiskLevel(overallScore, criticalGaps);
  const nextRecommendedAction = deriveNextRecommendedAction({
    overallScore,
    criticalGaps,
    hasResume,
    activeBacklogs: data.activeBacklogs,
    technicalScore: data.technicalScore,
    communicationScore: data.communicationScore,
    hasTechStack,
    linkedinUrl: data.linkedinUrl,
    githubUrl: data.githubUrl,
  });

  const scoreBreakdown: ScoreBreakdown = {
    weights: { ...READINESS_WEIGHTS },
    components,
    criticalGaps,
    profileChecks: profile.checks,
  };

  return {
    overallScore,
    ...components,
    riskLevel,
    readinessStatus,
    nextRecommendedAction,
    scoreBreakdown,
  };
}

export async function loadReadinessInputData(
  studentId: string
): Promise<ReadinessInputData | null> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      githubProfile: { select: { syncStatus: true } },
      techSkills: { select: { proficiencyLevel: true, verificationStatus: true } },
      roleInterests: { select: { readinessLevel: true } },
      resumes: {
        where: { isActive: true },
        take: 1,
        select: {
          resumeScore: true,
          atsFriendly: true,
          hasLinkedIn: true,
          hasGitHub: true,
          hasProjects: true,
          hasCertifications: true,
        },
      },
    },
  });

  if (!student) return null;

  const { getStudentCodingReadinessSignal } = await import(
    "@/lib/services/coding-platforms"
  );
  const codingSignal = await getStudentCodingReadinessSignal(studentId);

  return {
    technicalScore: student.technicalScore,
    communicationScore: student.communicationScore,
    cgpa: student.cgpa,
    activeBacklogs: student.activeBacklogs,
    email: student.email,
    phone: student.phone,
    linkedinUrl: student.linkedinUrl,
    githubUrl: student.githubUrl,
    githubSynced: student.githubProfile?.syncStatus === "SYNCED",
    hasVerifiedCodingProfile: codingSignal.hasVerifiedCodingProfile,
    maxCodingEvidenceScore: codingSignal.maxCodingEvidenceScore,
    resume: student.resumes[0] ?? null,
    techSkills: student.techSkills.map((s) => ({
      proficiencyLevel: s.proficiencyLevel as ProficiencyLevel,
      verificationStatus: s.verificationStatus as VerificationStatus,
    })),
    roleInterests: student.roleInterests.map((r) => ({
      readinessLevel: r.readinessLevel as RoleReadinessLevel,
    })),
  };
}

export async function recalculateStudentReadiness(
  studentId: string,
  options?: {
    actorUserId?: string;
    actorRole?: string;
    skipAudit?: boolean;
  }
): Promise<ReadinessSnapshotItem | null> {
  const input = await loadReadinessInputData(studentId);
  if (!input) return null;

  const previous = await getLatestReadinessSnapshot(studentId);
  const result = computeReadinessFromData(input);

  const snapshot = await prisma.$transaction(async (tx) => {
    const created = await tx.readinessSnapshot.create({
      data: {
        studentId,
        overallScore: result.overallScore,
        technicalReadiness: result.technicalReadiness,
        communicationReadiness: result.communicationReadiness,
        resumeReadiness: result.resumeReadiness,
        techStackReadiness: result.techStackReadiness,
        profileReadiness: result.profileReadiness,
        academicReadiness: result.academicReadiness,
        riskLevel: result.riskLevel,
        readinessStatus: result.readinessStatus,
        nextRecommendedAction: result.nextRecommendedAction,
        scoreBreakdownJson: JSON.stringify(result.scoreBreakdown),
      },
    });

    await tx.student.update({
      where: { id: studentId },
      data: { readinessScore: result.overallScore },
    });

    return created;
  });

  if (!options?.skipAudit) {
    const { logAudit } = await import("@/lib/services/audit");
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { fullName: true },
    });

    await logAudit({
      actorUserId: options?.actorUserId ?? null,
      actorRole: (options?.actorRole as import("@/types").UserRole) ?? null,
      action: "READINESS_RECALCULATED",
      entityType: "ReadinessSnapshot",
      entityId: snapshot.id,
      description: `Recalculated readiness for ${student?.fullName ?? studentId}: ${result.overallScore.toFixed(1)} (${result.readinessStatus})`,
    });

    if (
      previous &&
      previous.readinessStatus !== result.readinessStatus
    ) {
      await logAudit({
        actorUserId: options?.actorUserId ?? null,
        actorRole: (options?.actorRole as import("@/types").UserRole) ?? null,
        action: "READINESS_STATUS_CHANGED",
        entityType: "ReadinessSnapshot",
        entityId: snapshot.id,
        description: `Readiness status changed from ${previous.readinessStatus} to ${result.readinessStatus}`,
      });
    }

    if (previous && previous.riskLevel !== result.riskLevel) {
      await logAudit({
        actorUserId: options?.actorUserId ?? null,
        actorRole: (options?.actorRole as import("@/types").UserRole) ?? null,
        action: "RISK_LEVEL_CHANGED",
        entityType: "ReadinessSnapshot",
        entityId: snapshot.id,
        description: `Risk level changed from ${previous.riskLevel} to ${result.riskLevel}`,
      });
    }
  }

  return mapSnapshot(snapshot);
}

export async function triggerReadinessRecalculation(
  studentId: string
): Promise<void> {
  try {
    await recalculateStudentReadiness(studentId, { skipAudit: true });
  } catch (error) {
    logger.error("Auto-recalculation failed", { entityId: studentId, action: "readiness_auto" }, error);
  }
}

export async function recalculateBulkReadiness(options?: {
  branch?: string;
  batch?: string;
  actorUserId?: string;
  actorRole?: string;
}): Promise<{ count: number; message: string }> {
  const result = await recalculateBulkReadinessWithProgress({
    ...options,
    actorRole: options?.actorRole as import("@/types").UserRole | undefined,
  });
  return {
    count: result.recalculatedCount,
    message: `Recalculated readiness for ${result.recalculatedCount} student(s).`,
  };
}

export async function recalculateBulkReadinessWithProgress(options?: {
  branch?: string;
  batch?: string;
  actorUserId?: string;
  actorRole?: import("@/types").UserRole;
  onProgress?: (current: number, total: number) => void | Promise<void>;
}): Promise<{
  totalStudents: number;
  recalculatedCount: number;
  failedCount: number;
}> {
  const where: Prisma.StudentWhereInput = {};
  if (options?.branch) where.branch = options.branch;
  if (options?.batch) where.batch = options.batch;

  const { getBulkReadinessBatchSize } = await import("@/lib/export-limits");
  const batchSize = getBulkReadinessBatchSize();

  const students = await prisma.student.findMany({
    where,
    select: { id: true },
    orderBy: { id: "asc" },
  });

  const total = students.length;
  if (total === 0) {
    return { totalStudents: 0, recalculatedCount: 0, failedCount: 0 };
  }

  let recalculatedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < students.length; i += batchSize) {
    const chunk = students.slice(i, i + batchSize);
    for (const student of chunk) {
      try {
        await recalculateStudentReadiness(student.id, {
          actorUserId: options?.actorUserId,
          actorRole: options?.actorRole,
          skipAudit: true,
        });
        recalculatedCount += 1;
      } catch {
        failedCount += 1;
      }
      if (options?.onProgress) {
        await options.onProgress(recalculatedCount + failedCount, total);
      }
    }
  }

  const { logAudit } = await import("@/lib/services/audit");
  await logAudit({
    actorUserId: options?.actorUserId ?? null,
    actorRole: options?.actorRole ?? null,
    action: "READINESS_BULK_RECALCULATED",
    entityType: "ReadinessSnapshot",
    description: `Bulk readiness recalculation completed for ${recalculatedCount} students (${failedCount} failed)`,
  });

  return { totalStudents: total, recalculatedCount, failedCount };
}

export async function getLatestReadinessSnapshot(
  studentId: string
): Promise<ReadinessSnapshotItem | null> {
  const snapshot = await prisma.readinessSnapshot.findFirst({
    where: { studentId },
    orderBy: { calculatedAt: "desc" },
  });
  return snapshot ? mapSnapshot(snapshot) : null;
}

export async function getReadinessOverview(
  filters: ReadinessFilters = {}
): Promise<PaginatedResult<ReadinessOverviewItem>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 10));
  const skip = (page - 1) * pageSize;

  const studentWhere: Prisma.StudentWhereInput = {};

  if (filters.search) {
    const q = filters.search.trim();
    studentWhere.OR = [
      { fullName: { contains: q } },
      { rollNumber: { contains: q } },
    ];
  }
  if (filters.branch) studentWhere.branch = filters.branch;
  if (filters.batch) studentWhere.batch = filters.batch;
  if (filters.minScore !== undefined) {
    studentWhere.readinessScore = { gte: filters.minScore };
  }
  if (filters.maxScore !== undefined) {
    studentWhere.readinessScore = {
      ...(typeof studentWhere.readinessScore === "object"
        ? studentWhere.readinessScore
        : {}),
      lte: filters.maxScore,
    };
  }
  if (filters.readinessStatus) {
    studentWhere.readinessSnapshots = {
      some: { readinessStatus: filters.readinessStatus },
    };
  }
  if (filters.riskLevel) {
    studentWhere.readinessSnapshots = {
      some: { riskLevel: filters.riskLevel },
    };
  }

  const [total, students] = await Promise.all([
    prisma.student.count({ where: studentWhere }),
    prisma.student.findMany({
      where: studentWhere,
      orderBy: { readinessScore: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        fullName: true,
        rollNumber: true,
        branch: true,
        batch: true,
        readinessSnapshots: {
          orderBy: { calculatedAt: "desc" },
          take: 1,
        },
      },
    }),
  ]);

  const data: ReadinessOverviewItem[] = students.map((s) => {
    const snap = s.readinessSnapshots[0];
    return {
      studentId: s.id,
      fullName: s.fullName,
      rollNumber: s.rollNumber,
      branch: s.branch,
      batch: s.batch,
      overallScore: snap?.overallScore ?? 0,
      readinessStatus: (snap?.readinessStatus ?? "NOT_READY") as ReadinessStatus,
      riskLevel: (snap?.riskLevel ?? "CRITICAL") as RiskLevel,
      technicalReadiness: snap?.technicalReadiness ?? 0,
      communicationReadiness: snap?.communicationReadiness ?? 0,
      resumeReadiness: snap?.resumeReadiness ?? 0,
      techStackReadiness: snap?.techStackReadiness ?? 0,
      nextRecommendedAction:
        snap?.nextRecommendedAction ?? "Readiness not yet calculated.",
      calculatedAt: snap?.calculatedAt ?? null,
      snapshotId: snap?.id ?? null,
    };
  });

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getReadinessDashboardStats(): Promise<ReadinessDashboardStats> {
  const students = await prisma.student.findMany({
    select: {
      id: true,
      readinessSnapshots: {
        orderBy: { calculatedAt: "desc" },
        take: 1,
        select: {
          overallScore: true,
          readinessStatus: true,
          riskLevel: true,
          scoreBreakdownJson: true,
        },
      },
    },
  });

  const snapshots = students
    .map((s) => s.readinessSnapshots[0])
    .filter(Boolean);

  const placementReadyCount = snapshots.filter(
    (s) =>
      s.readinessStatus === "PLACEMENT_READY" ||
      s.readinessStatus === "HIGHLY_READY"
  ).length;

  const highRiskCount = snapshots.filter(
    (s) => s.riskLevel === "HIGH" || s.riskLevel === "CRITICAL"
  ).length;

  const avgReadinessScore =
    snapshots.length > 0
      ? roundScore(
          snapshots.reduce((sum, s) => sum + s.overallScore, 0) /
            snapshots.length
        )
      : 0;

  const statusCounts = new Map<ReadinessStatus, number>();
  const riskCounts = new Map<RiskLevel, number>();
  const gapCounts = new Map<string, number>();

  for (const snap of snapshots) {
    const status = snap.readinessStatus as ReadinessStatus;
    const risk = snap.riskLevel as RiskLevel;
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
    riskCounts.set(risk, (riskCounts.get(risk) ?? 0) + 1);

    try {
      const breakdown = JSON.parse(snap.scoreBreakdownJson) as ScoreBreakdown;
      for (const gap of breakdown.criticalGaps ?? []) {
        gapCounts.set(gap, (gapCounts.get(gap) ?? 0) + 1);
      }
    } catch {
      // ignore malformed breakdown
    }
  }

  return {
    placementReadyCount,
    highRiskCount,
    avgReadinessScore,
    statusDistribution: [...statusCounts.entries()].map(([status, count]) => ({
      status,
      count,
    })),
    riskDistribution: [...riskCounts.entries()].map(([risk, count]) => ({
      risk,
      count,
    })),
    topGaps: [...gapCounts.entries()]
      .map(([gap, count]) => ({ gap, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}

export async function getReadinessExportSummary(studentId: string) {
  const snap = await getLatestReadinessSnapshot(studentId);
  if (!snap) {
    return {
      overallReadinessScore: "—",
      readinessStatus: "—",
      riskLevel: "—",
      technicalReadiness: "—",
      communicationReadiness: "—",
      resumeReadiness: "—",
      techStackReadiness: "—",
      profileReadiness: "—",
      academicReadiness: "—",
      nextRecommendedAction: "—",
    };
  }

  const { READINESS_STATUS_LABELS, RISK_LEVEL_LABELS } = await import(
    "@/lib/readiness-constants"
  );

  return {
    overallReadinessScore: snap.overallScore.toFixed(1),
    readinessStatus: READINESS_STATUS_LABELS[snap.readinessStatus],
    riskLevel: RISK_LEVEL_LABELS[snap.riskLevel],
    technicalReadiness: snap.technicalReadiness.toFixed(1),
    communicationReadiness: snap.communicationReadiness.toFixed(1),
    resumeReadiness: snap.resumeReadiness.toFixed(1),
    techStackReadiness: snap.techStackReadiness.toFixed(1),
    profileReadiness: snap.profileReadiness.toFixed(1),
    academicReadiness: snap.academicReadiness.toFixed(1),
    nextRecommendedAction: snap.nextRecommendedAction,
  };
}

function mapSnapshot(snapshot: {
  id: string;
  studentId: string;
  overallScore: number;
  technicalReadiness: number;
  communicationReadiness: number;
  resumeReadiness: number;
  techStackReadiness: number;
  profileReadiness: number;
  academicReadiness: number;
  riskLevel: string;
  readinessStatus: string;
  nextRecommendedAction: string;
  scoreBreakdownJson: string;
  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): ReadinessSnapshotItem {
  let scoreBreakdown: ScoreBreakdown;
  try {
    scoreBreakdown = JSON.parse(snapshot.scoreBreakdownJson);
  } catch {
    scoreBreakdown = {
      weights: { ...READINESS_WEIGHTS },
      components: {
        technicalReadiness: snapshot.technicalReadiness,
        communicationReadiness: snapshot.communicationReadiness,
        resumeReadiness: snapshot.resumeReadiness,
        techStackReadiness: snapshot.techStackReadiness,
        profileReadiness: snapshot.profileReadiness,
        academicReadiness: snapshot.academicReadiness,
      },
      criticalGaps: [],
      profileChecks: {},
    };
  }

  return {
    id: snapshot.id,
    studentId: snapshot.studentId,
    overallScore: snapshot.overallScore,
    technicalReadiness: snapshot.technicalReadiness,
    communicationReadiness: snapshot.communicationReadiness,
    resumeReadiness: snapshot.resumeReadiness,
    techStackReadiness: snapshot.techStackReadiness,
    profileReadiness: snapshot.profileReadiness,
    academicReadiness: snapshot.academicReadiness,
    riskLevel: snapshot.riskLevel as RiskLevel,
    readinessStatus: snapshot.readinessStatus as ReadinessStatus,
    nextRecommendedAction: snapshot.nextRecommendedAction,
    scoreBreakdown,
    calculatedAt: snapshot.calculatedAt,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
  };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}

function escalateRisk(level: RiskLevel): RiskLevel {
  const order: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const idx = order.indexOf(level);
  return order[Math.min(idx + 1, order.length - 1)];
}
