import { prisma } from "@/lib/db";
import { ACTIVE_SHARE_STATUSES } from "@/lib/sharing-constants";
import { VERIFIED_STATUSES } from "@/lib/tech-constants";
import type {
  AnalyticsBundle,
  AnalyticsFilterOptions,
  AnalyticsFilters,
  AnalyticsPreview,
  BranchReadinessRow,
  CompanyRequirementAnalyticsRow,
  HrFunnelAnalytics,
  OverviewAnalytics,
  PassportAnalytics,
  PlacementOutcomeAnalytics,
  ResumeAnalytics,
  SkillGapRow,
  TechStackAnalytics,
} from "@/types/analytics";
import type { Prisma } from "@prisma/client";

function round(n: number, d = 1): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function pct(num: number, den: number): number {
  if (den <= 0) return 0;
  return round((num / den) * 100);
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function studentWhere(filters: AnalyticsFilters): Prisma.StudentWhereInput {
  const where: Prisma.StudentWhereInput = {};
  if (filters.branch) where.branch = filters.branch;
  if (filters.batch) where.batch = filters.batch;
  return where;
}

function shareWhere(filters: AnalyticsFilters): Prisma.SharedStudentProfileWhereInput {
  const where: Prisma.SharedStudentProfileWhereInput = {
    shareStatus: { in: ACTIVE_SHARE_STATUSES },
    revokedAt: null,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };
  if (filters.companyId) where.companyId = filters.companyId;
  if (filters.requirementId) where.companyRequirementId = filters.requirementId;
  if (filters.dateFrom || filters.dateTo) {
    where.sharedAt = {
      ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
      ...(filters.dateTo ? { lte: filters.dateTo } : {}),
    };
  }
  if (filters.branch || filters.batch) {
    where.student = studentWhere(filters);
  }
  return where;
}

export async function getAnalyticsFilterOptions(): Promise<AnalyticsFilterOptions> {
  const [branches, batches, companies, requirements] = await Promise.all([
    prisma.student.findMany({
      select: { branch: true },
      distinct: ["branch"],
      orderBy: { branch: "asc" },
    }),
    prisma.student.findMany({
      select: { batch: true },
      distinct: ["batch"],
      orderBy: { batch: "desc" },
    }),
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.companyRequirement.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        roleTitle: true,
        companyId: true,
        company: { select: { name: true } },
      },
      orderBy: { roleTitle: "asc" },
    }),
  ]);

  return {
    branches: branches.map((b) => b.branch),
    batches: batches.map((b) => b.batch),
    companies,
    requirements: requirements.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      label: `${r.company.name} · ${r.roleTitle}`,
    })),
  };
}

export async function getOverviewAnalytics(
  filters: AnalyticsFilters = {}
): Promise<OverviewAnalytics> {
  const sw = studentWhere(filters);
  const shares = shareWhere(filters);

  const [
    totalStudents,
    snapshotStudents,
    activeRequirements,
    sharedWithHr,
    hrInterested,
    hrShortlisted,
  ] = await Promise.all([
    prisma.student.count({ where: sw }),
    prisma.student.findMany({
      where: sw,
      select: {
        id: true,
        readinessSnapshots: {
          orderBy: { calculatedAt: "desc" },
          take: 1,
          select: { overallScore: true, readinessStatus: true, riskLevel: true },
        },
      },
    }),
    prisma.companyRequirement.count({
      where: {
        status: "ACTIVE",
        ...(filters.companyId ? { companyId: filters.companyId } : {}),
        ...(filters.requirementId ? { id: filters.requirementId } : {}),
      },
    }),
    prisma.sharedStudentProfile.count({ where: shares }),
    prisma.sharedStudentProfile.count({
      where: { ...shares, hrDecision: "INTERESTED" },
    }),
    prisma.sharedStudentProfile.count({
      where: {
        ...shares,
        OR: [{ hrDecision: "SHORTLISTED" }, { shareStatus: "SHORTLISTED" }],
      },
    }),
  ]);

  const snapshots = snapshotStudents
    .map((s) => s.readinessSnapshots[0])
    .filter(Boolean);

  const placementReady = snapshots.filter(
    (s) =>
      s!.readinessStatus === "PLACEMENT_READY" ||
      s!.readinessStatus === "HIGHLY_READY"
  ).length;

  const highRiskStudents = snapshots.filter(
    (s) => s!.riskLevel === "HIGH" || s!.riskLevel === "CRITICAL"
  ).length;

  const avgReadinessScore =
    snapshots.length > 0
      ? round(
          snapshots.reduce((sum, s) => sum + s!.overallScore, 0) /
            snapshots.length
        )
      : 0;

  return {
    totalStudents,
    placementReady,
    highRiskStudents,
    activeRequirements,
    sharedWithHr,
    hrInterested,
    hrShortlisted,
    avgReadinessScore,
  };
}

export async function getHrFunnelAnalytics(
  filters: AnalyticsFilters = {}
): Promise<HrFunnelAnalytics> {
  const shares = await prisma.sharedStudentProfile.findMany({
    where: shareWhere(filters),
    select: { shareStatus: true, hrDecision: true },
  });

  const shared = shares.length;
  const viewed = shares.filter(
    (s) =>
      s.shareStatus !== "SHARED" ||
      s.hrDecision !== "PENDING"
  ).length;
  const interested = shares.filter((s) => s.hrDecision === "INTERESTED").length;
  const shortlisted = shares.filter(
    (s) => s.hrDecision === "SHORTLISTED" || s.shareStatus === "SHORTLISTED"
  ).length;
  const rejected = shares.filter(
    (s) => s.hrDecision === "NOT_INTERESTED" || s.shareStatus === "REJECTED"
  ).length;

  return {
    shared,
    viewed,
    interested,
    shortlisted,
    rejected,
    conversionViewedRate: pct(viewed, shared),
    conversionInterestedRate: pct(interested, viewed),
    conversionShortlistedRate: pct(shortlisted, interested),
  };
}

export async function getCompanyRequirementAnalytics(
  filters: AnalyticsFilters = {}
): Promise<CompanyRequirementAnalyticsRow[]> {
  const requirements = await prisma.companyRequirement.findMany({
    where: {
      status: "ACTIVE",
      ...(filters.companyId ? { companyId: filters.companyId } : {}),
      ...(filters.requirementId ? { id: filters.requirementId } : {}),
    },
    include: {
      company: { select: { name: true } },
      matches: {
        select: {
          matchStatus: true,
          eligibilityStatus: true,
          studentId: true,
        },
      },
      sharedProfiles: {
        where: shareWhere(filters),
        select: { hrDecision: true, shareStatus: true },
      },
    },
    orderBy: { roleTitle: "asc" },
  });

  return requirements.map((req) => {
    let strongFit = 0;
    let goodFit = 0;
    let averageFit = 0;
    let riskFit = 0;
    let notEligible = 0;

    for (const m of req.matches) {
      switch (m.matchStatus) {
        case "STRONG_FIT":
          strongFit++;
          break;
        case "GOOD_FIT":
          goodFit++;
          break;
        case "AVERAGE_FIT":
          averageFit++;
          break;
        case "RISK_FIT":
          riskFit++;
          break;
        default:
          break;
      }
      if (m.eligibilityStatus === "NOT_ELIGIBLE") notEligible++;
    }

    const sharedCount = req.sharedProfiles.length;
    const hrInterestedCount = req.sharedProfiles.filter(
      (s) => s.hrDecision === "INTERESTED"
    ).length;
    const hrShortlistedCount = req.sharedProfiles.filter(
      (s) => s.hrDecision === "SHORTLISTED" || s.shareStatus === "SHORTLISTED"
    ).length;

    return {
      requirementId: req.id,
      companyName: req.company.name,
      roleTitle: req.roleTitle,
      totalMatched: req.matches.length,
      strongFit,
      goodFit,
      averageFit,
      riskFit,
      notEligible,
      sharedCount,
      hrInterestedCount,
      hrShortlistedCount,
    };
  });
}

export async function getBranchReadinessAnalytics(
  filters: AnalyticsFilters = {}
): Promise<BranchReadinessRow[]> {
  const students = await prisma.student.findMany({
    where: studentWhere(filters),
    select: {
      id: true,
      branch: true,
      techSkills: {
        select: { verificationStatus: true },
      },
      resumes: {
        where: { isActive: true },
        select: { reviewStatus: true },
        take: 1,
      },
      readinessSnapshots: {
        orderBy: { calculatedAt: "desc" },
        take: 1,
        select: {
          overallScore: true,
          technicalReadiness: true,
          communicationReadiness: true,
          riskLevel: true,
        },
      },
    },
  });

  const byBranch = new Map<
    string,
    {
      total: number;
      readinessSum: number;
      readinessCount: number;
      technicalSum: number;
      communicationSum: number;
      resumeApproved: number;
      verifiedSkillsSum: number;
      highRisk: number;
    }
  >();

  for (const s of students) {
    const snap = s.readinessSnapshots[0];
    const verified = s.techSkills.filter((sk) =>
      VERIFIED_STATUSES.includes(sk.verificationStatus as never)
    ).length;
    const approved =
      s.resumes[0]?.reviewStatus === "APPROVED" ? 1 : 0;
    const highRisk =
      snap && (snap.riskLevel === "HIGH" || snap.riskLevel === "CRITICAL")
        ? 1
        : 0;

    const row = byBranch.get(s.branch) ?? {
      total: 0,
      readinessSum: 0,
      readinessCount: 0,
      technicalSum: 0,
      communicationSum: 0,
      resumeApproved: 0,
      verifiedSkillsSum: 0,
      highRisk: 0,
    };

    row.total++;
    if (snap) {
      row.readinessSum += snap.overallScore;
      row.readinessCount++;
      row.technicalSum += snap.technicalReadiness;
      row.communicationSum += snap.communicationReadiness;
    }
    row.resumeApproved += approved;
    row.verifiedSkillsSum += verified;
    row.highRisk += highRisk;
    byBranch.set(s.branch, row);
  }

  return [...byBranch.entries()]
    .map(([branch, row]) => ({
      branch,
      totalStudents: row.total,
      avgReadiness:
        row.readinessCount > 0
          ? round(row.readinessSum / row.readinessCount)
          : 0,
      avgTechnical:
        row.readinessCount > 0
          ? round(row.technicalSum / row.readinessCount)
          : 0,
      avgCommunication:
        row.readinessCount > 0
          ? round(row.communicationSum / row.readinessCount)
          : 0,
      resumeApprovedCount: row.resumeApproved,
      avgVerifiedSkills:
        row.total > 0 ? round(row.verifiedSkillsSum / row.total, 1) : 0,
      highRiskCount: row.highRisk,
    }))
    .sort((a, b) => b.avgReadiness - a.avgReadiness);
}

export async function getSkillGapAnalytics(
  filters: AnalyticsFilters = {}
): Promise<SkillGapRow[]> {
  const activeReqs = await prisma.companyRequirement.findMany({
    where: {
      status: "ACTIVE",
      ...(filters.companyId ? { companyId: filters.companyId } : {}),
      ...(filters.requirementId ? { id: filters.requirementId } : {}),
    },
    select: { id: true },
  });
  const reqIds = activeReqs.map((r) => r.id);
  if (reqIds.length === 0) return [];

  const matches = await prisma.companyMatchSnapshot.findMany({
    where: {
      companyRequirementId: { in: reqIds },
      ...(filters.branch || filters.batch
        ? { student: studentWhere(filters) }
        : {}),
    },
    select: {
      missingSkillsJson: true,
      companyRequirementId: true,
      student: { select: { branch: true } },
    },
  });

  const skillMap = new Map<
    string,
    { count: number; reqs: Set<string>; branches: Map<string, number> }
  >();

  for (const m of matches) {
    for (const skill of parseJsonArray(m.missingSkillsJson)) {
      const key = skill.trim();
      if (!key) continue;
      const entry = skillMap.get(key) ?? {
        count: 0,
        reqs: new Set<string>(),
        branches: new Map<string, number>(),
      };
      entry.count++;
      entry.reqs.add(m.companyRequirementId);
      entry.branches.set(
        m.student.branch,
        (entry.branches.get(m.student.branch) ?? 0) + 1
      );
      skillMap.set(key, entry);
    }
  }

  return [...skillMap.entries()]
    .map(([skill, data]) => {
      const topBranches = [...data.branches.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([b]) => b);
      return {
        skill,
        missingCount: data.count,
        affectedRequirements: data.reqs.size,
        topBranches,
      };
    })
    .sort((a, b) => b.missingCount - a.missingCount)
    .slice(0, 15);
}

export async function getResumeAnalytics(
  filters: AnalyticsFilters = {}
): Promise<ResumeAnalytics> {
  const sw = studentWhere(filters);
  const studentIds = filters.branch || filters.batch
    ? (
        await prisma.student.findMany({
          where: sw,
          select: { id: true },
        })
      ).map((s) => s.id)
    : undefined;

  const resumes = await prisma.resume.findMany({
    where: {
      isActive: true,
      ...(studentIds ? { studentId: { in: studentIds } } : {}),
    },
    select: {
      reviewStatus: true,
      resumeScore: true,
      atsFriendly: true,
      hasLinkedIn: true,
      hasGitHub: true,
    },
  });

  const uploadedCount = resumes.length;
  const approvedCount = resumes.filter((r) => r.reviewStatus === "APPROVED").length;
  const needsImprovementCount = resumes.filter(
    (r) => r.reviewStatus === "NEEDS_IMPROVEMENT"
  ).length;
  const avgResumeScore =
    uploadedCount > 0
      ? round(resumes.reduce((s, r) => s + r.resumeScore, 0) / uploadedCount)
      : 0;
  const atsFriendlyCount = resumes.filter((r) => r.atsFriendly).length;
  const missingLinkedInCount = resumes.filter((r) => !r.hasLinkedIn).length;
  const missingGitHubCount = resumes.filter((r) => !r.hasGitHub).length;

  return {
    uploadedCount,
    approvedCount,
    needsImprovementCount,
    avgResumeScore,
    atsFriendlyCount,
    missingLinkedInCount,
    missingGitHubCount,
  };
}

export async function getTechStackAnalytics(
  filters: AnalyticsFilters = {}
): Promise<TechStackAnalytics> {
  const sw = studentWhere(filters);

  const [students, skills, interests, allSkills] = await Promise.all([
    prisma.student.findMany({
      where: sw,
      select: { id: true },
    }),
    prisma.studentTechSkill.findMany({
      where: filters.branch || filters.batch
        ? { student: sw }
        : undefined,
      select: {
        studentId: true,
        verificationStatus: true,
        techSkill: { select: { name: true } },
      },
    }),
    prisma.studentRoleInterest.findMany({
      where: filters.branch || filters.batch
        ? { student: sw }
        : undefined,
      select: { roleName: true },
    }),
    prisma.studentTechSkill.findMany({
      where: filters.branch || filters.batch
        ? { student: sw }
        : undefined,
      select: { verificationStatus: true },
    }),
  ]);

  const studentIds = new Set(students.map((s) => s.id));
  const skillsByStudent = new Map<string, number>();
  const verifiedSkillCounts = new Map<string, number>();

  for (const sk of skills) {
    if (!studentIds.has(sk.studentId) && (filters.branch || filters.batch))
      continue;
    skillsByStudent.set(
      sk.studentId,
      (skillsByStudent.get(sk.studentId) ?? 0) + 1
    );
    if (VERIFIED_STATUSES.includes(sk.verificationStatus as never)) {
      verifiedSkillCounts.set(
        sk.techSkill.name,
        (verifiedSkillCounts.get(sk.techSkill.name) ?? 0) + 1
      );
    }
  }

  const studentsWithTechStack = skillsByStudent.size;
  let verifiedTotal = 0;
  for (const sk of skills) {
    if (VERIFIED_STATUSES.includes(sk.verificationStatus as never)) {
      verifiedTotal++;
    }
  }
  const avgVerifiedSkillsPerStudent =
    studentsWithTechStack > 0
      ? round(verifiedTotal / studentsWithTechStack, 1)
      : 0;

  const unverifiedSkillCount = allSkills.filter(
    (s) => !VERIFIED_STATUSES.includes(s.verificationStatus as never)
  ).length;

  const roleCounts = new Map<string, number>();
  for (const ri of interests) {
    roleCounts.set(ri.roleName, (roleCounts.get(ri.roleName) ?? 0) + 1);
  }

  return {
    studentsWithTechStack,
    avgVerifiedSkillsPerStudent,
    topVerifiedSkills: [...verifiedSkillCounts.entries()]
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    unverifiedSkillCount,
    topRoleInterests: [...roleCounts.entries()]
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}

export async function getPassportAnalytics(
  filters: AnalyticsFilters = {}
): Promise<PassportAnalytics> {
  const dateFilter =
    filters.dateFrom || filters.dateTo
      ? {
          createdAt: {
            ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
            ...(filters.dateTo ? { lte: filters.dateTo } : {}),
          },
        }
      : {};

  const [passportsGenerated, auditCounts] = await Promise.all([
    prisma.placementPassportSnapshot.count({ where: dateFilter }),
    prisma.auditLog.groupBy({
      by: ["action"],
      where: {
        action: {
          in: [
            "PLACEMENT_PASSPORT_VIEWED_BY_HR",
            "PLACEMENT_PASSPORT_VIEWED_INTERNAL",
            "PLACEMENT_PASSPORT_PRINTED",
          ],
        },
        ...(filters.dateFrom || filters.dateTo
          ? {
              createdAt: {
                ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
                ...(filters.dateTo ? { lte: filters.dateTo } : {}),
              },
            }
          : {}),
      },
      _count: { action: true },
    }),
  ]);

  const countMap = new Map(
    auditCounts.map((a) => [a.action, a._count.action])
  );

  return {
    passportsGenerated,
    hrPassportViews: countMap.get("PLACEMENT_PASSPORT_VIEWED_BY_HR") ?? 0,
    internalPassportViews:
      countMap.get("PLACEMENT_PASSPORT_VIEWED_INTERNAL") ?? 0,
    printDownloadActions: countMap.get("PLACEMENT_PASSPORT_PRINTED") ?? 0,
  };
}

export async function getPlacementOutcomeAnalytics(
  filters: AnalyticsFilters = {}
): Promise<PlacementOutcomeAnalytics> {
  const driveWhere: Prisma.PlacementDriveWhereInput = {};
  if (filters.companyId) driveWhere.companyId = filters.companyId;
  if (filters.requirementId) driveWhere.companyRequirementId = filters.requirementId;
  if (filters.dateFrom || filters.dateTo) {
    driveWhere.driveDate = {};
    if (filters.dateFrom) driveWhere.driveDate.gte = filters.dateFrom;
    if (filters.dateTo) driveWhere.driveDate.lte = filters.dateTo;
  }

  const stageWhere: Prisma.StudentPlacementStageWhereInput = {
    drive: driveWhere,
    ...(filters.branch || filters.batch
      ? {
          student: {
            ...(filters.branch ? { branch: filters.branch } : {}),
            ...(filters.batch ? { batch: filters.batch } : {}),
          },
        }
      : {}),
  };

  const [
    totalDrives,
    activeDrives,
    stages,
    drives,
  ] = await Promise.all([
    prisma.placementDrive.count({ where: driveWhere }),
    prisma.placementDrive.count({
      where: { ...driveWhere, status: { in: ["UPCOMING", "ONGOING"] } },
    }),
    prisma.studentPlacementStage.findMany({
      where: stageWhere,
      include: {
        student: { select: { branch: true } },
        drive: {
          include: { company: { select: { name: true } } },
        },
      },
    }),
    prisma.placementDrive.findMany({
      where: driveWhere,
      include: {
        company: { select: { name: true } },
        stages: { select: { currentStage: true, registrationStatus: true } },
      },
    }),
  ]);

  const registered = stages.filter(
    (s) => s.currentStage !== "NOT_REGISTERED"
  ).length;
  const eligible = stages.filter((s) =>
    ["ELIGIBLE", "SHARED_WITH_HR", "HR_VIEWED", "HR_INTERESTED", "SHORTLISTED", "INTERVIEW_SCHEDULED", "TECHNICAL_ROUND", "HR_ROUND", "SELECTED", "OFFERED", "JOINED"].includes(s.currentStage)
  ).length;
  const attended = stages.filter(
    (s) => s.attendanceStatus === "PASSED"
  ).length;
  const shortlisted = stages.filter((s) =>
    ["SHORTLISTED", "INTERVIEW_SCHEDULED", "TECHNICAL_ROUND", "HR_ROUND", "SELECTED", "OFFERED", "JOINED"].includes(s.currentStage)
  ).length;
  const technicalCleared = stages.filter(
    (s) => s.technicalRoundStatus === "PASSED"
  ).length;
  const hrCleared = stages.filter((s) => s.hrRoundStatus === "PASSED").length;
  const selected = stages.filter(
    (s) =>
      s.currentStage === "SELECTED" ||
      s.finalOutcome === "SELECTED" ||
      ["OFFERED", "JOINED"].includes(s.currentStage)
  ).length;
  const offered = stages.filter(
    (s) =>
      s.currentStage === "OFFERED" ||
      s.finalOutcome === "OFFERED" ||
      s.currentStage === "JOINED"
  ).length;
  const joined = stages.filter(
    (s) => s.currentStage === "JOINED" || s.finalOutcome === "JOINED"
  ).length;
  const rejected = stages.filter(
    (s) => s.currentStage === "REJECTED" || s.finalOutcome === "REJECTED"
  ).length;

  const packages = stages
    .map((s) => s.packageLpa)
    .filter((p): p is number => p != null);
  const avgPackageLpa =
    packages.length > 0
      ? round(packages.reduce((a, b) => a + b, 0) / packages.length, 2)
      : null;

  const driveConversions = drives.map((d) => {
    const reg = d.stages.filter((s) => s.currentStage !== "NOT_REGISTERED").length;
    const j = d.stages.filter((s) => s.currentStage === "JOINED").length;
    return {
      driveId: d.id,
      driveTitle: d.driveTitle,
      companyName: d.company.name,
      registered: reg,
      joined: j,
      conversionRate: pct(j, reg),
    };
  });

  const branchMap = new Map<string, number>();
  for (const s of stages) {
    if (
      s.currentStage === "SELECTED" ||
      s.currentStage === "OFFERED" ||
      s.currentStage === "JOINED"
    ) {
      branchMap.set(
        s.student.branch,
        (branchMap.get(s.student.branch) ?? 0) + 1
      );
    }
  }
  const branchSelections = [...branchMap.entries()]
    .map(([branch, selectionCount]) => ({ branch, selectionCount }))
    .sort((a, b) => b.selectionCount - a.selectionCount);

  return {
    totalDrives,
    activeDrives,
    selectionCount: selected,
    offerCount: offered,
    joinedCount: joined,
    rejectionCount: rejected,
    avgPackageLpa,
    funnel: {
      registered,
      eligible,
      attended,
      shortlisted,
      technicalCleared,
      hrCleared,
      selected,
      offered,
      joined,
      rejected,
    },
    driveConversions: driveConversions.slice(0, 10),
    branchSelections: branchSelections.slice(0, 8),
  };
}

export async function getAnalyticsBundle(
  filters: AnalyticsFilters = {}
): Promise<AnalyticsBundle> {
  const [
    overview,
    hrFunnel,
    companyRequirements,
    branchReadiness,
    skillGaps,
    resume,
    techStack,
    passport,
    placementOutcomes,
  ] = await Promise.all([
    getOverviewAnalytics(filters),
    getHrFunnelAnalytics(filters),
    getCompanyRequirementAnalytics(filters),
    getBranchReadinessAnalytics(filters),
    getSkillGapAnalytics(filters),
    getResumeAnalytics(filters),
    getTechStackAnalytics(filters),
    getPassportAnalytics(filters),
    getPlacementOutcomeAnalytics(filters),
  ]);

  return {
    overview,
    hrFunnel,
    companyRequirements,
    branchReadiness,
    skillGaps,
    resume,
    techStack,
    passport,
    placementOutcomes,
  };
}

export async function getAnalyticsPreview(
  filters: AnalyticsFilters = {}
): Promise<AnalyticsPreview> {
  const [hrFunnel, skillGaps, branchReadiness] = await Promise.all([
    getHrFunnelAnalytics(filters),
    getSkillGapAnalytics(filters),
    getBranchReadinessAnalytics(filters),
  ]);

  return {
    hrFunnel: {
      shared: hrFunnel.shared,
      interested: hrFunnel.interested,
      shortlisted: hrFunnel.shortlisted,
      viewedRate: hrFunnel.conversionViewedRate,
    },
    topMissingSkills: skillGaps.slice(0, 3).map((s) => ({
      skill: s.skill,
      count: s.missingCount,
    })),
    topBranch: branchReadiness[0]
      ? {
          branch: branchReadiness[0].branch,
          avgReadiness: branchReadiness[0].avgReadiness,
        }
      : null,
  };
}

export function parseAnalyticsFilters(
  params: Record<string, string | undefined>
): AnalyticsFilters {
  const filters: AnalyticsFilters = {};
  if (params.batch) filters.batch = params.batch;
  if (params.branch) filters.branch = params.branch;
  if (params.companyId) filters.companyId = params.companyId;
  if (params.requirementId) filters.requirementId = params.requirementId;
  if (params.dateFrom) filters.dateFrom = new Date(params.dateFrom);
  if (params.dateTo) {
    const d = new Date(params.dateTo);
    d.setHours(23, 59, 59, 999);
    filters.dateTo = d;
  }
  return filters;
}
