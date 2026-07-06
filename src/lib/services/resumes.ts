import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { MIME_TO_EXT } from "@/lib/resume-constants";
import {
  buildResumeFileName,
  getStorageProvider,
  sanitizeFileName,
} from "@/lib/storage/resume-storage";
import type { ResumeReviewInput } from "@/lib/validations/resume";
import type {
  PaginatedResult,
  ResumeFilters,
  ResumeItem,
  ResumeListItem,
  ResumeReviewStatus,
  ResumeStatus,
} from "@/types";
import { getLatestInsightsForResumes } from "@/lib/services/resume-insights";

function mapResume(resume: {
  id: string;
  studentId: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  uploadedByUserId: string;
  reviewedByUserId: string | null;
  reviewStatus: string;
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
}): ResumeItem {
  return {
    ...resume,
    reviewStatus: resume.reviewStatus as ResumeReviewStatus,
  };
}

function syncStudentResumeStatus(
  reviewStatus: ResumeReviewStatus
): ResumeStatus {
  switch (reviewStatus) {
    case "APPROVED":
      return "APPROVED";
    case "REVIEWED":
    case "NEEDS_IMPROVEMENT":
      return "REVIEWED";
    case "UPLOADED":
    case "UNDER_REVIEW":
      return "UPLOADED";
    default:
      return "NOT_UPLOADED";
  }
}

async function enrichWithUserNames(
  resumes: ResumeItem[]
): Promise<ResumeItem[]> {
  const userIds = [
    ...new Set(
      resumes
        .flatMap((r) => [r.uploadedByUserId, r.reviewedByUserId])
        .filter(Boolean)
    ),
  ] as string[];

  if (userIds.length === 0) return resumes;

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const map = new Map(users.map((u) => [u.id, u.name]));

  return resumes.map((r) => ({
    ...r,
    uploadedByName: map.get(r.uploadedByUserId) ?? null,
    reviewedByName: r.reviewedByUserId
      ? map.get(r.reviewedByUserId) ?? null
      : null,
  }));
}

export async function getActiveResumeForStudent(
  studentId: string
): Promise<ResumeItem | null> {
  const resume = await prisma.resume.findFirst({
    where: { studentId, isActive: true },
    orderBy: { version: "desc" },
  });
  if (!resume) return null;
  const [enriched] = await enrichWithUserNames([mapResume(resume)]);
  return enriched;
}

export async function getResumeById(id: string): Promise<ResumeItem | null> {
  const resume = await prisma.resume.findUnique({ where: { id } });
  if (!resume) return null;
  const [enriched] = await enrichWithUserNames([mapResume(resume)]);
  return enriched;
}

export async function uploadResume(
  studentId: string,
  file: { name: string; type: string; size: number; buffer: Buffer },
  uploadedByUserId: string
): Promise<ResumeItem> {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new Error("Student not found");

  const ext =
    MIME_TO_EXT[file.type] ??
    (file.name.toLowerCase().endsWith(".docx") ? ".docx" : ".pdf");

  const latestVersion = await prisma.resume.findFirst({
    where: { studentId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latestVersion?.version ?? 0) + 1;

  const fileName = buildResumeFileName(
    student.rollNumber,
    student.fullName,
    version,
    ext
  );
  const relativePath = fileName;

  const storage = getStorageProvider();
  await storage.save(relativePath, file.buffer);

  await prisma.resume.updateMany({
    where: { studentId, isActive: true },
    data: { isActive: false },
  });

  const resume = await prisma.resume.create({
    data: {
      studentId,
      fileName,
      originalFileName: sanitizeFileName(file.name) || fileName,
      filePath: relativePath,
      mimeType: file.type,
      fileSize: file.size,
      uploadedByUserId,
      reviewStatus: "UPLOADED",
      version,
      isActive: true,
    },
  });

  await prisma.student.update({
    where: { id: studentId },
    data: { resumeStatus: "UPLOADED" },
  });

  const [enriched] = await enrichWithUserNames([mapResume(resume)]);
  return enriched;
}

export async function reviewResume(
  resumeId: string,
  input: ResumeReviewInput,
  reviewedByUserId: string
): Promise<ResumeItem> {
  const existing = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!existing || !existing.isActive) {
    throw new Error("Resume not found");
  }

  const resume = await prisma.resume.update({
    where: { id: resumeId },
    data: {
      reviewStatus: input.reviewStatus,
      atsFriendly: input.atsFriendly ?? false,
      resumeScore: input.resumeScore ?? 0,
      hasLinkedIn: input.hasLinkedIn ?? false,
      hasGitHub: input.hasGitHub ?? false,
      hasProjects: input.hasProjects ?? false,
      hasCertifications: input.hasCertifications ?? false,
      reviewerComments: input.reviewerComments ?? null,
      reviewedByUserId,
    },
  });

  await prisma.student.update({
    where: { id: existing.studentId },
    data: {
      resumeStatus: syncStudentResumeStatus(input.reviewStatus),
    },
  });

  const [enriched] = await enrichWithUserNames([mapResume(resume)]);
  return enriched;
}

export async function deactivateResume(resumeId: string): Promise<void> {
  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!resume) throw new Error("Resume not found");

  await prisma.resume.update({
    where: { id: resumeId },
    data: { isActive: false },
  });

  const hasOtherActive = await prisma.resume.findFirst({
    where: { studentId: resume.studentId, isActive: true },
  });

  if (!hasOtherActive) {
    await prisma.student.update({
      where: { id: resume.studentId },
      data: { resumeStatus: "NOT_UPLOADED" },
    });
  }
}

export async function getResumeFileBuffer(
  resumeId: string
): Promise<{ buffer: Buffer; resume: ResumeItem }> {
  const record = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!record) throw new Error("Resume not found");

  const storage = getStorageProvider();
  const buffer = await storage.read(record.filePath);
  const [resume] = await enrichWithUserNames([mapResume(record)]);
  return { buffer, resume };
}

function buildResumeWhereClause(
  filters: ResumeFilters
): Prisma.ResumeWhereInput {
  const where: Prisma.ResumeWhereInput = { isActive: true };

  const studentWhere: Prisma.StudentWhereInput = {};

  if (filters.search) {
    const search = filters.search.trim();
    studentWhere.OR = [
      { fullName: { contains: search } },
      { rollNumber: { contains: search } },
    ];
  }

  if (filters.branch) studentWhere.branch = filters.branch;
  if (filters.batch) studentWhere.batch = filters.batch;

  if (Object.keys(studentWhere).length > 0) {
    where.student = studentWhere;
  }

  if (filters.reviewStatus) {
    where.reviewStatus = filters.reviewStatus;
  }

  if (filters.atsFriendly !== undefined) {
    where.atsFriendly = filters.atsFriendly;
  }

  if (filters.scoreMin !== undefined || filters.scoreMax !== undefined) {
    where.resumeScore = {};
    if (filters.scoreMin !== undefined) {
      where.resumeScore.gte = filters.scoreMin;
    }
    if (filters.scoreMax !== undefined) {
      where.resumeScore.lte = filters.scoreMax;
    }
  }

  return where;
}

export async function getResumeList(
  filters: ResumeFilters = {}
): Promise<PaginatedResult<ResumeListItem>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 10));
  const skip = (page - 1) * pageSize;
  const where = buildResumeWhereClause(filters);

  const [resumes, total] = await Promise.all([
    prisma.resume.findMany({
      where,
      include: {
        student: {
          select: {
            fullName: true,
            rollNumber: true,
            branch: true,
            batch: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.resume.count({ where }),
  ]);

  const mapped: ResumeListItem[] = resumes.map((r) => ({
    ...mapResume(r),
    studentName: r.student.fullName,
    rollNumber: r.student.rollNumber,
    branch: r.student.branch,
    batch: r.student.batch,
  }));

  const enriched = await enrichWithUserNames(mapped);

  const insightMap = await getLatestInsightsForResumes(
    enriched.map((r) => r.id)
  );

  const withInsights = enriched.map((r) => {
    const insight = insightMap.get(r.id);
    return {
      ...r,
      insightMeta: insight
        ? {
            insightId: insight.id,
            hasInsight: true,
            suggestedResumeScore: insight.suggestedResumeScore,
            atsIssuesCount: insight.atsIssues.length,
            provider: insight.provider,
            reviewStatus: insight.reviewStatus,
          }
        : {
            insightId: null,
            hasInsight: false,
            suggestedResumeScore: null,
            atsIssuesCount: 0,
            provider: null,
            reviewStatus: null,
          },
    };
  });

  return {
    data: withInsights as ResumeListItem[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getResumeStats() {
  const [uploaded, approved, avgScore] = await Promise.all([
    prisma.resume.count({ where: { isActive: true } }),
    prisma.resume.count({
      where: { isActive: true, reviewStatus: "APPROVED" },
    }),
    prisma.resume.aggregate({
      where: { isActive: true },
      _avg: { resumeScore: true },
    }),
  ]);

  return {
    resumeUploaded: uploaded,
    resumeApproved: approved,
    avgResumeScore: avgScore._avg.resumeScore ?? 0,
  };
}

export async function getActiveResumesForStudents(studentIds: string[]) {
  if (studentIds.length === 0) return new Map<string, ResumeItem>();

  const resumes = await prisma.resume.findMany({
    where: { studentId: { in: studentIds }, isActive: true },
  });

  const map = new Map<string, ResumeItem>();
  for (const r of resumes) {
    map.set(r.studentId, mapResume(r));
  }
  return map;
}
