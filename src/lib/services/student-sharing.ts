import { prisma } from "@/lib/db";
import { ACTIVE_SHARE_STATUSES } from "@/lib/sharing-constants";
import { getLatestReadinessSnapshot } from "@/lib/services/readiness";
import { getActiveResumeForStudent } from "@/lib/services/resumes";
import { getStudentTechSkills } from "@/lib/services/tech-stack";
import { getHrSafeEvidenceSummary } from "@/lib/services/skill-evidence";
import {
  getActiveCompanyIdsForHr,
  getHrCompaniesForUser,
  verifyHrCompanyAccess,
} from "@/lib/services/hr-access";
import type { PaginatedResult } from "@/types";
import type {
  HRDecision,
  HrDashboardStats,
  HrSharedStudentDetail,
  HrTalentRoomFilters,
  ShareStatus,
  SharedStudentFilters,
  SharedStudentListItem,
} from "@/types/sharing";
import { Prisma } from "@prisma/client";

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function isShareActive(share: {
  shareStatus: string;
  revokedAt: Date | null;
  expiresAt: Date | null;
}): boolean {
  if (share.revokedAt) return false;
  if (share.shareStatus === "REVOKED" || share.shareStatus === "EXPIRED") {
    return false;
  }
  if (share.expiresAt && share.expiresAt < new Date()) return false;
  return ACTIVE_SHARE_STATUSES.includes(share.shareStatus as ShareStatus);
}

async function expireStaleShares(): Promise<void> {
  await prisma.sharedStudentProfile.updateMany({
    where: {
      shareStatus: { in: ["SHARED", "VIEWED", "SHORTLISTED", "REJECTED"] },
      expiresAt: { lt: new Date() },
    },
    data: { shareStatus: "EXPIRED" },
  });
}

type ShareRow = {
  id: string;
  companyId: string;
  companyRequirementId: string;
  studentId: string;
  shareStatus: string;
  hrDecision: string;
  allowResumeDownload: boolean;
  allowPlacementPassport: boolean;
  sharedAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  sharedWithUserId: string | null;
  company: { name: string };
  requirement: { roleTitle: string };
  student: {
    fullName: string;
    rollNumber: string;
    branch: string;
    batch: string;
    readinessScore: number;
  };
  sharedBy: { name: string };
  sharedWith: { name: string } | null;
};

async function mapShareListItem(
  share: ShareRow,
  matchMap: Map<string, { matchScore: number; matchStatus: string; matchedSkillsJson: string }>,
  resumeSet: Set<string>
): Promise<SharedStudentListItem> {
  const matchKey = `${share.companyRequirementId}:${share.studentId}`;
  const match = matchMap.get(matchKey);
  const skills = match ? parseJsonArray(match.matchedSkillsJson) : [];

  return {
    id: share.id,
    companyId: share.companyId,
    companyName: share.company.name,
    companyRequirementId: share.companyRequirementId,
    roleTitle: share.requirement.roleTitle,
    studentId: share.studentId,
    studentName: share.student.fullName,
    rollNumber: share.student.rollNumber,
    branch: share.student.branch,
    batch: share.student.batch,
    matchScore: match?.matchScore ?? 0,
    matchStatus: match?.matchStatus ?? "NOT_FIT",
    readinessScore: share.student.readinessScore,
    shareStatus: share.shareStatus as ShareStatus,
    hrDecision: share.hrDecision as SharedStudentListItem["hrDecision"],
    allowResumeDownload: share.allowResumeDownload,
    allowPlacementPassport: share.allowPlacementPassport,
    sharedAt: share.sharedAt,
    expiresAt: share.expiresAt,
    sharedByName: share.sharedBy.name,
    sharedWithName: share.sharedWith?.name ?? null,
    hasResume: resumeSet.has(share.studentId),
    keySkills: skills.slice(0, 5),
  };
}

async function loadMatchMap(
  pairs: { requirementId: string; studentId: string }[]
): Promise<Map<string, { matchScore: number; matchStatus: string; matchedSkillsJson: string }>> {
  if (pairs.length === 0) return new Map();

  const matches = await prisma.companyMatchSnapshot.findMany({
    where: {
      OR: pairs.map((p) => ({
        companyRequirementId: p.requirementId,
        studentId: p.studentId,
      })),
    },
    select: {
      companyRequirementId: true,
      studentId: true,
      matchScore: true,
      matchStatus: true,
      matchedSkillsJson: true,
    },
  });

  return new Map(
    matches.map((m) => [
      `${m.companyRequirementId}:${m.studentId}`,
      {
        matchScore: m.matchScore,
        matchStatus: m.matchStatus,
        matchedSkillsJson: m.matchedSkillsJson,
      },
    ])
  );
}

export async function shareStudentsWithHr(input: {
  companyId: string;
  companyRequirementId: string;
  studentIds: string[];
  sharedByUserId: string;
  sharedWithUserId?: string | null;
  allowResumeDownload: boolean;
  allowPlacementPassport: boolean;
  expiresAt?: Date | null;
  sharingNote?: string | null;
}): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const studentId of input.studentIds) {
    const existing = await prisma.sharedStudentProfile.findFirst({
      where: {
        companyId: input.companyId,
        companyRequirementId: input.companyRequirementId,
        studentId,
        shareStatus: { in: ACTIVE_SHARE_STATUSES },
      },
    });

    if (existing && isShareActive(existing)) {
      await prisma.sharedStudentProfile.update({
        where: { id: existing.id },
        data: {
          allowResumeDownload: input.allowResumeDownload,
          allowPlacementPassport: input.allowPlacementPassport,
          expiresAt: input.expiresAt ?? null,
          sharingNote: input.sharingNote ?? null,
          sharedWithUserId: input.sharedWithUserId ?? null,
          revokedAt: null,
          shareStatus: "SHARED",
          sharedAt: new Date(),
          sharedByUserId: input.sharedByUserId,
        },
      });
      updated++;
    } else {
      await prisma.sharedStudentProfile.create({
        data: {
          companyId: input.companyId,
          companyRequirementId: input.companyRequirementId,
          studentId,
          sharedByUserId: input.sharedByUserId,
          sharedWithUserId: input.sharedWithUserId ?? null,
          allowResumeDownload: input.allowResumeDownload,
          allowPlacementPassport: input.allowPlacementPassport,
          expiresAt: input.expiresAt ?? null,
          sharingNote: input.sharingNote ?? null,
        },
      });
      created++;
    }
  }

  if (input.allowPlacementPassport) {
    for (const studentId of input.studentIds) {
      const share = await prisma.sharedStudentProfile.findFirst({
        where: {
          companyId: input.companyId,
          companyRequirementId: input.companyRequirementId,
          studentId,
          shareStatus: { in: ACTIVE_SHARE_STATUSES },
        },
        orderBy: { sharedAt: "desc" },
      });
      if (share) {
        const { ensureSharePassportSnapshot } = await import(
          "@/lib/services/placement-passport"
        );
        await ensureSharePassportSnapshot(share.id);
      }
    }
  }

  return { created, updated };
}

export async function bulkShareByMatchFilter(input: {
  companyId: string;
  companyRequirementId: string;
  matchFilter: "STRONG_FIT" | "GOOD_AND_STRONG";
  sharedByUserId: string;
  sharedWithUserId?: string | null;
  allowResumeDownload: boolean;
  allowPlacementPassport: boolean;
  expiresAt?: Date | null;
  sharingNote?: string | null;
}): Promise<{ count: number }> {
  const statuses =
    input.matchFilter === "STRONG_FIT"
      ? (["STRONG_FIT"] as const)
      : (["STRONG_FIT", "GOOD_FIT"] as const);

  const matches = await prisma.companyMatchSnapshot.findMany({
    where: {
      companyRequirementId: input.companyRequirementId,
      matchStatus: { in: [...statuses] },
    },
    select: { studentId: true },
    take: 500,
  });

  if (matches.length >= 500) {
    throw new Error(
      "Bulk share matches 500+ students. Use filters or share selected students in smaller batches."
    );
  }

  const result = await shareStudentsWithHr({
    ...input,
    studentIds: matches.map((m) => m.studentId),
  });

  return { count: result.created + result.updated };
}

export async function revokeShares(shareIds: string[]): Promise<number> {
  const result = await prisma.sharedStudentProfile.updateMany({
    where: { id: { in: shareIds } },
    data: {
      shareStatus: "REVOKED",
      revokedAt: new Date(),
    },
  });
  return result.count;
}

export async function updateSharePermissions(
  shareId: string,
  data: {
    allowResumeDownload?: boolean;
    allowPlacementPassport?: boolean;
    expiresAt?: Date | null;
  }
): Promise<void> {
  await prisma.sharedStudentProfile.update({
    where: { id: shareId },
    data,
  });
}

export async function getInternalSharedStudents(
  filters: SharedStudentFilters = {}
): Promise<PaginatedResult<SharedStudentListItem>> {
  await expireStaleShares();

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 15));
  const skip = (page - 1) * pageSize;

  const where: Prisma.SharedStudentProfileWhereInput = {};

  if (filters.companyId) where.companyId = filters.companyId;
  if (filters.requirementId) where.companyRequirementId = filters.requirementId;
  if (filters.shareStatus) where.shareStatus = filters.shareStatus;
  if (filters.hrDecision) where.hrDecision = filters.hrDecision;

  const studentWhere: Prisma.StudentWhereInput = {};
  if (filters.branch) studentWhere.branch = filters.branch;
  if (filters.batch) studentWhere.batch = filters.batch;
  if (filters.search) {
    const s = filters.search.trim();
    studentWhere.OR = [
      { fullName: { contains: s } },
      { rollNumber: { contains: s } },
    ];
  }
  if (Object.keys(studentWhere).length > 0) where.student = studentWhere;

  const [shares, total] = await Promise.all([
    prisma.sharedStudentProfile.findMany({
      where,
      include: {
        company: { select: { name: true } },
        requirement: { select: { roleTitle: true } },
        student: {
          select: {
            fullName: true,
            rollNumber: true,
            branch: true,
            batch: true,
            readinessScore: true,
          },
        },
        sharedBy: { select: { name: true } },
        sharedWith: { select: { name: true } },
      },
      orderBy: { sharedAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.sharedStudentProfile.count({ where }),
  ]);

  const pairs = shares.map((s) => ({
    requirementId: s.companyRequirementId,
    studentId: s.studentId,
  }));
  const matchMap = await loadMatchMap(pairs);

  const studentIds = shares.map((s) => s.studentId);
  const resumes = await prisma.resume.findMany({
    where: { studentId: { in: studentIds }, isActive: true },
    select: { studentId: true },
  });
  const resumeSet = new Set(resumes.map((r) => r.studentId));

  const data = await Promise.all(
    shares.map((s) => mapShareListItem(s, matchMap, resumeSet))
  );

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
}

function buildHrShareWhere(
  userId: string,
  companyIds: string[],
  filters: HrTalentRoomFilters
): Prisma.SharedStudentProfileWhereInput {
  const where: Prisma.SharedStudentProfileWhereInput = {
    companyId: filters.companyId
      ? filters.companyId
      : { in: companyIds },
    OR: [{ sharedWithUserId: null }, { sharedWithUserId: userId }],
    shareStatus: { in: ACTIVE_SHARE_STATUSES },
    revokedAt: null,
    NOT: {
      AND: [{ expiresAt: { not: null } }, { expiresAt: { lt: new Date() } }],
    },
  };

  if (filters.requirementId) where.companyRequirementId = filters.requirementId;
  if (filters.hrDecision) where.hrDecision = filters.hrDecision;

  const studentWhere: Prisma.StudentWhereInput = {};
  if (filters.branch) studentWhere.branch = filters.branch;
  if (filters.search) {
    const s = filters.search.trim();
    studentWhere.OR = [
      { fullName: { contains: s } },
      { rollNumber: { contains: s } },
    ];
  }
  if (Object.keys(studentWhere).length > 0) where.student = studentWhere;

  return where;
}

export async function getHrTalentRoom(
  userId: string,
  filters: HrTalentRoomFilters = {}
): Promise<PaginatedResult<SharedStudentListItem>> {
  await expireStaleShares();

  const companyIds = await getActiveCompanyIdsForHr(userId);
  if (companyIds.length === 0) {
    return { data: [], total: 0, page: 1, pageSize: 15, totalPages: 1 };
  }

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 15));
  const skip = (page - 1) * pageSize;

  let where = buildHrShareWhere(userId, companyIds, filters);

  let shares = await prisma.sharedStudentProfile.findMany({
    where,
    include: {
      company: { select: { name: true } },
      requirement: { select: { roleTitle: true } },
      student: {
        select: {
          fullName: true,
          rollNumber: true,
          branch: true,
          batch: true,
          readinessScore: true,
        },
      },
      sharedBy: { select: { name: true } },
      sharedWith: { select: { name: true } },
    },
    orderBy: { sharedAt: "desc" },
  });

  shares = shares.filter(isShareActive);

  const pairs = shares.map((s) => ({
    requirementId: s.companyRequirementId,
    studentId: s.studentId,
  }));
  let matchMap = await loadMatchMap(pairs);

  if (filters.matchStatus) {
    shares = shares.filter((s) => {
      const m = matchMap.get(`${s.companyRequirementId}:${s.studentId}`);
      return m?.matchStatus === filters.matchStatus;
    });
  }

  if (filters.readinessStatus) {
    const snapshots = await prisma.readinessSnapshot.findMany({
      where: { studentId: { in: shares.map((s) => s.studentId) } },
      orderBy: { calculatedAt: "desc" },
      distinct: ["studentId"],
      select: { studentId: true, readinessStatus: true },
    });
    const statusMap = new Map(snapshots.map((s) => [s.studentId, s.readinessStatus]));
    shares = shares.filter(
      (s) => statusMap.get(s.studentId) === filters.readinessStatus
    );
  }

  if (filters.skill) {
    const needle = filters.skill.trim().toLowerCase();
    shares = shares.filter((s) => {
      const m = matchMap.get(`${s.companyRequirementId}:${s.studentId}`);
      if (!m) return false;
      return parseJsonArray(m.matchedSkillsJson).some(
        (sk) => sk.toLowerCase().includes(needle)
      );
    });
  }

  const total = shares.length;
  const paged = shares.slice(skip, skip + pageSize);

  const studentIds = paged.map((s) => s.studentId);
  const resumes = await prisma.resume.findMany({
    where: { studentId: { in: studentIds }, isActive: true },
    select: { studentId: true },
  });
  const resumeSet = new Set(resumes.map((r) => r.studentId));

  matchMap = await loadMatchMap(
    paged.map((s) => ({
      requirementId: s.companyRequirementId,
      studentId: s.studentId,
    }))
  );

  const data = await Promise.all(
    paged.map((s) => mapShareListItem(s, matchMap, resumeSet))
  );

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getHrDashboardStats(
  userId: string
): Promise<HrDashboardStats> {
  await expireStaleShares();

  const assignedCompanies = await getHrCompaniesForUser(userId);
  const companyIds = assignedCompanies.map((c) => c.id);

  if (companyIds.length === 0) {
    return {
      assignedCompanies: [],
      sharedStudentsCount: 0,
      pendingReviewCount: 0,
      interestedCount: 0,
      shortlistedCount: 0,
      recentlyShared: [],
    };
  }

  const shares = await prisma.sharedStudentProfile.findMany({
    where: {
      companyId: { in: companyIds },
      OR: [{ sharedWithUserId: null }, { sharedWithUserId: userId }],
    },
    include: {
      company: { select: { name: true } },
      requirement: { select: { roleTitle: true } },
      student: {
        select: {
          fullName: true,
          rollNumber: true,
          branch: true,
          batch: true,
          readinessScore: true,
        },
      },
      sharedBy: { select: { name: true } },
      sharedWith: { select: { name: true } },
    },
    orderBy: { sharedAt: "desc" },
  });

  const active = shares.filter(isShareActive);

  const pairs = active.map((s) => ({
    requirementId: s.companyRequirementId,
    studentId: s.studentId,
  }));
  const matchMap = await loadMatchMap(pairs);
  const resumeSet = new Set(
    (
      await prisma.resume.findMany({
        where: {
          studentId: { in: active.map((s) => s.studentId) },
          isActive: true,
        },
        select: { studentId: true },
      })
    ).map((r) => r.studentId)
  );

  const recentlyShared = await Promise.all(
    active.slice(0, 5).map((s) => mapShareListItem(s, matchMap, resumeSet))
  );

  return {
    assignedCompanies: assignedCompanies.map((c) => ({
      id: c.id,
      name: c.name,
    })),
    sharedStudentsCount: active.length,
    pendingReviewCount: active.filter((s) => s.hrDecision === "PENDING").length,
    interestedCount: active.filter((s) => s.hrDecision === "INTERESTED").length,
    shortlistedCount: active.filter(
      (s) => s.hrDecision === "SHORTLISTED" || s.shareStatus === "SHORTLISTED"
    ).length,
    recentlyShared,
  };
}

export async function canHrViewShare(
  userId: string,
  shareId: string
): Promise<boolean> {
  const share = await prisma.sharedStudentProfile.findUnique({
    where: { id: shareId },
  });
  if (!share || !isShareActive(share)) return false;

  const hasAccess = await verifyHrCompanyAccess(userId, share.companyId);
  if (!hasAccess) return false;

  if (share.sharedWithUserId && share.sharedWithUserId !== userId) {
    return false;
  }

  return true;
}

export async function getHrSharedStudentDetail(
  shareId: string,
  userId: string
): Promise<HrSharedStudentDetail | null> {
  const allowed = await canHrViewShare(userId, shareId);
  if (!allowed) return null;

  const share = await prisma.sharedStudentProfile.findUnique({
    where: { id: shareId },
    include: {
      company: { select: { id: true, name: true } },
      requirement: { select: { id: true, roleTitle: true } },
      student: true,
    },
  });
  if (!share) return null;

  const [match, readiness, resume, techSkills, evidenceSummary] = await Promise.all([
    prisma.companyMatchSnapshot.findUnique({
      where: {
        companyRequirementId_studentId: {
          companyRequirementId: share.companyRequirementId,
          studentId: share.studentId,
        },
      },
    }),
    getLatestReadinessSnapshot(share.studentId),
    getActiveResumeForStudent(share.studentId),
    getStudentTechSkills(share.studentId),
    getHrSafeEvidenceSummary(share.studentId),
  ]);

  if (share.shareStatus === "SHARED") {
    await prisma.sharedStudentProfile.update({
      where: { id: shareId },
      data: { shareStatus: "VIEWED" },
    });
  }

  return {
    share: {
      id: share.id,
      shareStatus: share.shareStatus as ShareStatus,
      hrDecision: share.hrDecision as HRDecision,
      hrComments: share.hrComments,
      allowResumeDownload: share.allowResumeDownload,
      allowPlacementPassport: share.allowPlacementPassport,
      sharedAt: share.sharedAt,
      expiresAt: share.expiresAt,
    },
    student: {
      id: share.student.id,
      fullName: share.student.fullName,
      rollNumber: share.student.rollNumber,
      email: share.student.email,
      phone: share.student.phone,
      branch: share.student.branch,
      batch: share.student.batch,
      graduationYear: share.student.graduationYear,
      cgpa: share.student.cgpa,
      activeBacklogs: share.student.activeBacklogs,
      linkedinUrl: share.student.linkedinUrl,
      githubUrl: share.student.githubUrl,
      technicalScore: share.student.technicalScore,
      communicationScore: share.student.communicationScore,
    },
    company: share.company,
    requirement: share.requirement,
    match: match
      ? {
          matchScore: match.matchScore,
          matchStatus: match.matchStatus,
          eligibilityStatus: match.eligibilityStatus,
          matchedSkills: parseJsonArray(match.matchedSkillsJson),
          missingSkills: parseJsonArray(match.missingSkillsJson),
          risks: parseJsonArray(match.risksJson),
        }
      : null,
    readiness: readiness
      ? {
          overallScore: readiness.overallScore,
          readinessStatus: readiness.readinessStatus,
          riskLevel: readiness.riskLevel,
          technicalReadiness: readiness.technicalReadiness,
          communicationReadiness: readiness.communicationReadiness,
          resumeReadiness: readiness.resumeReadiness,
          techStackReadiness: readiness.techStackReadiness,
        }
      : null,
    resume: resume
      ? {
          id: resume.id,
          reviewStatus: resume.reviewStatus,
          resumeScore: resume.resumeScore,
          atsFriendly: resume.atsFriendly,
          originalFileName: resume.originalFileName,
        }
      : null,
    techSkills: techSkills.map((s) => ({
      name: s.skillName,
      proficiencyLevel: s.proficiencyLevel,
      verificationStatus: s.verificationStatus,
    })),
    evidenceSummary: {
      verifiedSkills: evidenceSummary.verifiedSkills,
      strongEvidenceSkills: evidenceSummary.strongEvidenceSkills,
      githubSummary: evidenceSummary.githubSummary,
      codingPlatformSummary: evidenceSummary.codingPlatformSummary,
    },
  };
}

export async function updateHrDecision(
  shareId: string,
  userId: string,
  decision: HRDecision,
  comments?: string | null
): Promise<void> {
  const allowed = await canHrViewShare(userId, shareId);
  if (!allowed) throw new Error("Access denied");

  const shareStatusUpdate =
    decision === "SHORTLISTED"
      ? "SHORTLISTED"
      : decision === "NOT_INTERESTED"
        ? "REJECTED"
        : undefined;

  await prisma.sharedStudentProfile.update({
    where: { id: shareId },
    data: {
      hrDecision: decision,
      hrComments: comments ?? null,
      ...(shareStatusUpdate ? { shareStatus: shareStatusUpdate } : {}),
    },
  });
}

export async function canHrDownloadResume(
  userId: string,
  shareId: string
): Promise<{ allowed: boolean; resumeId: string | null }> {
  const share = await prisma.sharedStudentProfile.findUnique({
    where: { id: shareId },
  });
  if (!share || !isShareActive(share) || !share.allowResumeDownload) {
    return { allowed: false, resumeId: null };
  }

  const hasAccess = await canHrViewShare(userId, shareId);
  if (!hasAccess) return { allowed: false, resumeId: null };

  const resume = await getActiveResumeForStudent(share.studentId);
  if (!resume) return { allowed: false, resumeId: null };

  return { allowed: true, resumeId: resume.id };
}

export async function getExistingSharesForStudents(
  requirementId: string,
  studentIds: string[]
): Promise<Map<string, string>> {
  const shares = await prisma.sharedStudentProfile.findMany({
    where: {
      companyRequirementId: requirementId,
      studentId: { in: studentIds },
      shareStatus: { in: ACTIVE_SHARE_STATUSES },
    },
    select: { id: true, studentId: true, revokedAt: true, expiresAt: true, shareStatus: true },
  });

  const map = new Map<string, string>();
  for (const s of shares) {
    if (isShareActive(s)) map.set(s.studentId, s.id);
  }
  return map;
}
