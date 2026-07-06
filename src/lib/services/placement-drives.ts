import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  applyStageAction,
  isEligibleStage,
  isRegisteredStage,
} from "@/lib/placement-constants";
import type { PaginatedResult } from "@/types";
import type {
  DriveFunnelSummary,
  DriveStageFilters,
  DriveStageListItem,
  PlacementDriveDetail,
  PlacementDriveFilters,
  PlacementDriveListItem,
  PlacementCurrentStage,
  StageAction,
  StudentPlacementHistoryItem,
} from "@/types/placement-drive";
import type { MatchStatus } from "@/types/company";

function mapDrive(
  drive: {
    id: string;
    driveTitle: string;
    driveDate: Date | null;
    venue: string | null;
    mode: string;
    status: string;
    companyId: string;
    companyRequirementId: string | null;
    notes: string | null;
    createdByUserId: string;
    createdAt: Date;
    updatedAt: Date;
    company: { name: string };
    requirement: { roleTitle: string } | null;
    _count?: { stages: number };
  },
  joinedCount = 0
): PlacementDriveListItem {
  return {
    id: drive.id,
    driveTitle: drive.driveTitle,
    driveDate: drive.driveDate?.toISOString() ?? null,
    venue: drive.venue,
    mode: drive.mode as PlacementDriveListItem["mode"],
    status: drive.status as PlacementDriveListItem["status"],
    companyId: drive.companyId,
    companyName: drive.company.name,
    companyRequirementId: drive.companyRequirementId,
    roleTitle: drive.requirement?.roleTitle ?? null,
    studentCount: drive._count?.stages ?? 0,
    joinedCount,
    createdAt: drive.createdAt.toISOString(),
  };
}

export async function getDrivesByRequirement(requirementId: string) {
  const drives = await prisma.placementDrive.findMany({
    where: {
      companyRequirementId: requirementId,
      status: { notIn: ["ARCHIVED", "CANCELLED"] },
    },
    select: { id: true, driveTitle: true, status: true },
    orderBy: { createdAt: "desc" },
  });
  return drives;
}

export async function getPlacementDriveList(
  filters: PlacementDriveFilters = {}
): Promise<PaginatedResult<PlacementDriveListItem>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 12));
  const skip = (page - 1) * pageSize;

  const where: Prisma.PlacementDriveWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.companyId) where.companyId = filters.companyId;
  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { driveTitle: { contains: q } },
      { company: { name: { contains: q } } },
    ];
  }

  const [drives, total] = await Promise.all([
    prisma.placementDrive.findMany({
      where,
      include: {
        company: { select: { name: true } },
        requirement: { select: { roleTitle: true } },
        _count: { select: { stages: true } },
      },
      orderBy: [{ driveDate: "desc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.placementDrive.count({ where }),
  ]);

  const driveIds = drives.map((d) => d.id);
  const joinedCounts =
    driveIds.length > 0
      ? await prisma.studentPlacementStage.groupBy({
          by: ["placementDriveId"],
          where: {
            placementDriveId: { in: driveIds },
            currentStage: "JOINED",
          },
          _count: true,
        })
      : [];
  const joinedMap = new Map(
    joinedCounts.map((j) => [j.placementDriveId, j._count])
  );

  return {
    data: drives.map((d) => mapDrive(d, joinedMap.get(d.id) ?? 0)),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getPlacementDriveById(
  id: string
): Promise<PlacementDriveDetail | null> {
  const drive = await prisma.placementDrive.findUnique({
    where: { id },
    include: {
      company: { select: { name: true } },
      requirement: { select: { roleTitle: true } },
      _count: { select: { stages: true } },
    },
  });
  if (!drive) return null;

  const joinedCount = await prisma.studentPlacementStage.count({
    where: { placementDriveId: id, currentStage: "JOINED" },
  });

  return {
    ...mapDrive(drive, joinedCount),
    notes: drive.notes,
    createdByUserId: drive.createdByUserId,
    updatedAt: drive.updatedAt.toISOString(),
  };
}

export async function createPlacementDrive(input: {
  companyId: string;
  companyRequirementId?: string | null;
  driveTitle: string;
  driveDate?: Date | null;
  venue?: string | null;
  mode?: string;
  status?: string;
  notes?: string | null;
  createdByUserId: string;
}) {
  const drive = await prisma.placementDrive.create({
    data: {
      companyId: input.companyId,
      companyRequirementId: input.companyRequirementId ?? null,
      driveTitle: input.driveTitle,
      driveDate: input.driveDate ?? null,
      venue: input.venue ?? null,
      mode: (input.mode as "ONLINE" | "OFFLINE" | "HYBRID") ?? "OFFLINE",
      status: (input.status as "DRAFT" | "UPCOMING") ?? "DRAFT",
      notes: input.notes ?? null,
      createdByUserId: input.createdByUserId,
    },
    include: {
      company: { select: { name: true } },
      requirement: { select: { roleTitle: true } },
      _count: { select: { stages: true } },
    },
  });
  return mapDrive(drive, 0);
}

export async function updatePlacementDrive(
  id: string,
  input: Partial<{
    driveTitle: string;
    driveDate: Date | null;
    venue: string | null;
    mode: string;
    status: string;
    notes: string | null;
    companyRequirementId: string | null;
  }>
) {
  const drive = await prisma.placementDrive.update({
    where: { id },
    data: {
      ...(input.driveTitle !== undefined ? { driveTitle: input.driveTitle } : {}),
      ...(input.driveDate !== undefined ? { driveDate: input.driveDate } : {}),
      ...(input.venue !== undefined ? { venue: input.venue } : {}),
      ...(input.mode !== undefined
        ? { mode: input.mode as "ONLINE" | "OFFLINE" | "HYBRID" }
        : {}),
      ...(input.status !== undefined
        ? {
            status: input.status as
              | "DRAFT"
              | "UPCOMING"
              | "ONGOING"
              | "COMPLETED"
              | "CANCELLED"
              | "ARCHIVED",
          }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.companyRequirementId !== undefined
        ? { companyRequirementId: input.companyRequirementId }
        : {}),
    },
    include: {
      company: { select: { name: true } },
      requirement: { select: { roleTitle: true } },
      _count: { select: { stages: true } },
    },
  });
  const joinedCount = await prisma.studentPlacementStage.count({
    where: { placementDriveId: id, currentStage: "JOINED" },
  });
  return mapDrive(drive, joinedCount);
}

export async function getDriveFunnel(driveId: string): Promise<DriveFunnelSummary> {
  const stages = await prisma.studentPlacementStage.findMany({
    where: { placementDriveId: driveId },
    select: {
      currentStage: true,
      finalOutcome: true,
      attendanceStatus: true,
      technicalRoundStatus: true,
      hrRoundStatus: true,
    },
  });

  const summary: DriveFunnelSummary = {
    registered: 0,
    eligible: 0,
    attended: 0,
    shortlisted: 0,
    technicalCleared: 0,
    hrCleared: 0,
    selected: 0,
    offered: 0,
    joined: 0,
    rejected: 0,
    withdrawn: 0,
    total: stages.length,
  };

  for (const s of stages) {
    const stage = s.currentStage as PlacementCurrentStage;
    if (isRegisteredStage(stage)) summary.registered += 1;
    if (isEligibleStage(stage)) summary.eligible += 1;
    if (s.attendanceStatus === "PASSED") summary.attended += 1;
    if (
      stage === "SHORTLISTED" ||
      [
        "INTERVIEW_SCHEDULED",
        "TECHNICAL_ROUND",
        "HR_ROUND",
        "SELECTED",
        "OFFERED",
        "JOINED",
      ].includes(stage)
    ) {
      summary.shortlisted += 1;
    }
    if (s.technicalRoundStatus === "PASSED") summary.technicalCleared += 1;
    if (s.hrRoundStatus === "PASSED") summary.hrCleared += 1;
    if (stage === "SELECTED" || s.finalOutcome === "SELECTED") summary.selected += 1;
    if (stage === "OFFERED" || s.finalOutcome === "OFFERED") summary.offered += 1;
    if (stage === "JOINED" || s.finalOutcome === "JOINED") summary.joined += 1;
    if (s.finalOutcome === "REJECTED" || stage === "REJECTED") summary.rejected += 1;
    if (s.finalOutcome === "WITHDRAWN" || stage === "WITHDRAWN") summary.withdrawn += 1;
  }

  return summary;
}

async function getMatchScoresForDrive(
  driveId: string,
  studentIds: string[]
): Promise<Map<string, number>> {
  const drive = await prisma.placementDrive.findUnique({
    where: { id: driveId },
    select: { companyRequirementId: true },
  });
  const map = new Map<string, number>();
  if (!drive?.companyRequirementId || studentIds.length === 0) return map;

  const matches = await prisma.companyMatchSnapshot.findMany({
    where: {
      companyRequirementId: drive.companyRequirementId,
      studentId: { in: studentIds },
    },
    select: { studentId: true, matchScore: true },
  });
  for (const m of matches) map.set(m.studentId, m.matchScore);
  return map;
}

export async function getDriveStages(
  driveId: string,
  filters: DriveStageFilters = {}
): Promise<PaginatedResult<DriveStageListItem>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.StudentPlacementStageWhereInput = {
    placementDriveId: driveId,
  };

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
  if (Object.keys(studentWhere).length > 0) where.student = studentWhere;
  if (filters.currentStage) where.currentStage = filters.currentStage;
  if (filters.finalOutcome) where.finalOutcome = filters.finalOutcome;
  if (filters.attendanceStatus) where.attendanceStatus = filters.attendanceStatus;

  const [stages, total] = await Promise.all([
    prisma.studentPlacementStage.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            rollNumber: true,
            branch: true,
            batch: true,
            email: true,
            phone: true,
            cgpa: true,
            readinessScore: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.studentPlacementStage.count({ where }),
  ]);

  const matchScores = await getMatchScoresForDrive(
    driveId,
    stages.map((s) => s.studentId)
  );

  const data: DriveStageListItem[] = stages.map((s) => ({
    id: s.id,
    studentId: s.studentId,
    fullName: s.student.fullName,
    rollNumber: s.student.rollNumber,
    branch: s.student.branch,
    batch: s.student.batch,
    email: s.student.email,
    phone: s.student.phone,
    cgpa: s.student.cgpa,
    readinessScore: s.student.readinessScore,
    matchScore: matchScores.get(s.studentId) ?? null,
    currentStage: s.currentStage as DriveStageListItem["currentStage"],
    finalOutcome: s.finalOutcome as DriveStageListItem["finalOutcome"],
    registrationStatus: s.registrationStatus as DriveStageListItem["registrationStatus"],
    attendanceStatus: s.attendanceStatus as DriveStageListItem["attendanceStatus"],
    technicalRoundStatus:
      s.technicalRoundStatus as DriveStageListItem["technicalRoundStatus"],
    hrRoundStatus: s.hrRoundStatus as DriveStageListItem["hrRoundStatus"],
    offerStatus: s.offerStatus as DriveStageListItem["offerStatus"],
    joiningStatus: s.joiningStatus as DriveStageListItem["joiningStatus"],
    packageLpa: s.packageLpa,
    offerLocation: s.offerLocation,
    rejectionReason: s.rejectionReason,
    notes: s.notes,
    updatedAt: s.updatedAt.toISOString(),
  }));

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
}

export async function addStudentsToDrive(
  driveId: string,
  studentIds: string[],
  updatedByUserId: string
): Promise<{ added: number; skipped: number }> {
  const unique = [...new Set(studentIds)];
  let added = 0;
  let skipped = 0;

  for (const studentId of unique) {
    try {
      await prisma.studentPlacementStage.create({
        data: {
          placementDriveId: driveId,
          studentId,
          updatedByUserId,
        },
      });
      added += 1;
    } catch {
      skipped += 1;
    }
  }

  return { added, skipped };
}

export async function removeStudentFromDrive(stageId: string): Promise<void> {
  await prisma.studentPlacementStage.delete({ where: { id: stageId } });
}

export async function updateStudentStage(
  stageId: string,
  action: StageAction,
  updatedByUserId: string,
  extras?: { rejectionReason?: string; packageLpa?: number; offerLocation?: string; notes?: string }
) {
  const existing = await prisma.studentPlacementStage.findUnique({
    where: { id: stageId },
  });
  if (!existing) throw new Error("Stage record not found");

  const next = applyStageAction(action, existing, extras);

  return prisma.studentPlacementStage.update({
    where: { id: stageId },
    data: {
      currentStage: next.currentStage,
      finalOutcome: next.finalOutcome,
      registrationStatus: next.registrationStatus,
      attendanceStatus: next.attendanceStatus,
      technicalRoundStatus: next.technicalRoundStatus,
      hrRoundStatus: next.hrRoundStatus,
      offerStatus: next.offerStatus,
      joiningStatus: next.joiningStatus,
      rejectionReason: next.rejectionReason,
      packageLpa: next.packageLpa,
      offerLocation: next.offerLocation,
      notes: extras?.notes ?? existing.notes,
      updatedByUserId,
    },
  });
}

export async function bulkUpdateStudentStages(
  stageIds: string[],
  action: StageAction,
  updatedByUserId: string,
  extras?: { rejectionReason?: string; packageLpa?: number; offerLocation?: string }
): Promise<number> {
  const { getBulkStageUpdateLimit } = await import("@/lib/export-limits");
  const limit = getBulkStageUpdateLimit();
  if (stageIds.length > limit) {
    throw new Error(
      `Bulk update limited to ${limit} students at a time. Select fewer rows or run multiple batches.`
    );
  }

  let count = 0;
  for (const id of stageIds) {
    try {
      await updateStudentStage(id, action, updatedByUserId, extras);
      count += 1;
    } catch {
      // skip invalid
    }
  }
  return count;
}

export async function getStudentPlacementHistory(
  studentId: string
): Promise<StudentPlacementHistoryItem[]> {
  const stages = await prisma.studentPlacementStage.findMany({
    where: { studentId },
    include: {
      drive: {
        include: {
          company: { select: { name: true } },
          requirement: { select: { roleTitle: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return stages.map((s) => ({
    id: s.id,
    driveId: s.placementDriveId,
    driveTitle: s.drive.driveTitle,
    companyName: s.drive.company.name,
    roleTitle: s.drive.requirement?.roleTitle ?? null,
    driveDate: s.drive.driveDate?.toISOString() ?? null,
    currentStage: s.currentStage as StudentPlacementHistoryItem["currentStage"],
    finalOutcome: s.finalOutcome as StudentPlacementHistoryItem["finalOutcome"],
    packageLpa: s.packageLpa,
    notes: s.notes,
    updatedAt: s.updatedAt.toISOString(),
  }));
}

export async function createDriveFromRequirement(
  requirementId: string,
  createdByUserId: string,
  overrides?: { driveTitle?: string; driveDate?: Date | null; status?: string }
) {
  const req = await prisma.companyRequirement.findUnique({
    where: { id: requirementId },
    include: { company: { select: { name: true } } },
  });
  if (!req) throw new Error("Requirement not found");

  const title =
    overrides?.driveTitle ??
    `${req.company.name} — ${req.roleTitle} Drive`;

  return createPlacementDrive({
    companyId: req.companyId,
    companyRequirementId: requirementId,
    driveTitle: title,
    driveDate: overrides?.driveDate ?? null,
    status: overrides?.status ?? "UPCOMING",
    createdByUserId,
  });
}

export async function addMatchedStudentsToDrive(
  driveId: string,
  requirementId: string,
  matchFilter: "STRONG_FIT" | "GOOD_AND_STRONG" | "SELECTED",
  studentIds: string[] | undefined,
  updatedByUserId: string
) {
  let ids = studentIds ?? [];

  if (!studentIds?.length) {
    const where: Prisma.CompanyMatchSnapshotWhereInput = {
      companyRequirementId: requirementId,
    };
    if (matchFilter === "STRONG_FIT") {
      where.matchStatus = "STRONG_FIT";
    } else if (matchFilter === "GOOD_AND_STRONG") {
      where.matchStatus = { in: ["STRONG_FIT", "GOOD_FIT"] };
    }
    const matches = await prisma.companyMatchSnapshot.findMany({
      where,
      select: { studentId: true },
    });
    ids = matches.map((m) => m.studentId);
  }

  return addStudentsToDrive(driveId, ids, updatedByUserId);
}

export async function addShortlistedSharesToDrive(
  driveId: string,
  requirementId: string,
  shareIds: string[] | undefined,
  updatedByUserId: string
) {
  const where: Prisma.SharedStudentProfileWhereInput = {
    companyRequirementId: requirementId,
    hrDecision: { in: ["INTERESTED", "SHORTLISTED"] },
    shareStatus: { in: ["SHARED", "VIEWED", "SHORTLISTED"] },
  };
  if (shareIds?.length) where.id = { in: shareIds };

  const shares = await prisma.sharedStudentProfile.findMany({
    where,
    select: { studentId: true },
  });

  const result = await addStudentsToDrive(
    driveId,
    shares.map((s) => s.studentId),
    updatedByUserId
  );

  for (const share of shares) {
    await prisma.studentPlacementStage.updateMany({
      where: { placementDriveId: driveId, studentId: share.studentId },
      data: {
        currentStage: "SHORTLISTED",
        updatedByUserId,
      },
    });
  }

  return result;
}

export async function getDriveExportRows(driveId: string) {
  const drive = await prisma.placementDrive.findUnique({
    where: { id: driveId },
    include: {
      company: { select: { name: true } },
      requirement: { select: { roleTitle: true } },
    },
  });
  if (!drive) throw new Error("Drive not found");

  const stages = await prisma.studentPlacementStage.findMany({
    where: { placementDriveId: driveId },
    include: {
      student: true,
    },
    orderBy: { student: { fullName: "asc" } },
  });

  const matchScores = await getMatchScoresForDrive(
    driveId,
    stages.map((s) => s.studentId)
  );

  return stages.map((s) => ({
    driveTitle: drive.driveTitle,
    company: drive.company.name,
    role: drive.requirement?.roleTitle ?? "",
    studentName: s.student.fullName,
    rollNumber: s.student.rollNumber,
    branch: s.student.branch,
    batch: s.student.batch,
    email: s.student.email,
    phone: s.student.phone ?? "",
    cgpa: s.student.cgpa,
    readinessScore: s.student.readinessScore,
    matchScore: matchScores.get(s.studentId) ?? null,
    currentStage: s.currentStage,
    finalOutcome: s.finalOutcome,
    attendanceStatus: s.attendanceStatus,
    technicalRoundStatus: s.technicalRoundStatus,
    hrRoundStatus: s.hrRoundStatus,
    offerStatus: s.offerStatus,
    joiningStatus: s.joiningStatus,
    packageLpa: s.packageLpa,
    offerLocation: s.offerLocation ?? "",
    rejectionReason: s.rejectionReason ?? "",
    notes: s.notes ?? "",
  }));
}

export type MatchFilter = "STRONG_FIT" | "GOOD_AND_STRONG" | "SELECTED";

export function matchStatusesForFilter(filter: MatchFilter): MatchStatus[] {
  if (filter === "STRONG_FIT") return ["STRONG_FIT"];
  if (filter === "GOOD_AND_STRONG") return ["STRONG_FIT", "GOOD_FIT"];
  return [];
}
