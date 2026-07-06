import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { UserRole } from "@/types";
import type { JobFilters, JobItem, JobMeta, JobStatus, JobType } from "@/types/jobs";

export interface CreateJobInput {
  jobType: JobType;
  title: string;
  description?: string;
  createdByUserId: string;
  progressTotal?: number;
  meta?: JobMeta;
}

function parseResultJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function mapJob(
  job: {
    id: string;
    jobType: string;
    status: string;
    title: string;
    description: string | null;
    progressCurrent: number;
    progressTotal: number;
    progressPercent: number;
    resultJson: string | null;
    errorMessage: string | null;
    createdByUserId: string;
    startedAt: Date | null;
    completedAt: Date | null;
    failedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: { name: string; email: string } | null;
  }
): JobItem {
  return {
    id: job.id,
    jobType: job.jobType as JobType,
    status: job.status as JobStatus,
    title: job.title,
    description: job.description,
    progressCurrent: job.progressCurrent,
    progressTotal: job.progressTotal,
    progressPercent: job.progressPercent,
    resultJson: parseResultJson(job.resultJson),
    errorMessage: job.errorMessage,
    createdByUserId: job.createdByUserId,
    createdByName: job.createdBy?.name ?? null,
    createdByEmail: job.createdBy?.email ?? null,
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    failedAt: job.failedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

function computePercent(current: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((current / total) * 100));
}

export async function createJob(input: CreateJobInput): Promise<JobItem> {
  const resultPayload =
    input.meta && Object.keys(input.meta).length > 0
      ? JSON.stringify({ _meta: input.meta })
      : null;

  const job = await prisma.job.create({
    data: {
      jobType: input.jobType,
      status: "QUEUED",
      title: input.title,
      description: input.description ?? null,
      progressTotal: input.progressTotal ?? 0,
      progressCurrent: 0,
      progressPercent: 0,
      resultJson: resultPayload,
      createdByUserId: input.createdByUserId,
    },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  const { logAudit } = await import("@/lib/services/audit");
  await logAudit({
    actorUserId: input.createdByUserId,
    action: "JOB_CREATED",
    entityType: "Job",
    entityId: job.id,
    description: `Job created: ${input.title}`,
  });

  return mapJob(job);
}

export async function startJob(jobId: string): Promise<void> {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      errorMessage: null,
    },
  });

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { createdByUserId: true, title: true },
  });

  if (job) {
    const { logAudit } = await import("@/lib/services/audit");
    await logAudit({
      actorUserId: job.createdByUserId,
      action: "JOB_STARTED",
      entityType: "Job",
      entityId: jobId,
      description: `Job started: ${job.title}`,
    });
  }
}

export async function updateJobProgress(
  jobId: string,
  current: number,
  total?: number
): Promise<void> {
  const existing = await prisma.job.findUnique({
    where: { id: jobId },
    select: { progressTotal: true },
  });
  if (!existing) return;

  const progressTotal = total ?? existing.progressTotal;
  await prisma.job.update({
    where: { id: jobId },
    data: {
      progressCurrent: current,
      progressTotal,
      progressPercent: computePercent(current, progressTotal),
    },
  });
}

export async function completeJob(
  jobId: string,
  result: Record<string, unknown>
): Promise<void> {
  const existing = await prisma.job.findUnique({
    where: { id: jobId },
    select: { resultJson: true, progressTotal: true, createdByUserId: true, title: true },
  });
  if (!existing) return;

  const prior = parseResultJson(existing.resultJson);
  const meta = prior?._meta;
  const merged = meta ? { ...result, _meta: meta } : result;

  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      progressCurrent: existing.progressTotal || undefined,
      progressPercent: 100,
      resultJson: JSON.stringify(merged),
      errorMessage: null,
    },
  });

  const { logAudit } = await import("@/lib/services/audit");
  await logAudit({
    actorUserId: existing.createdByUserId,
    action: "JOB_COMPLETED",
    entityType: "Job",
    entityId: jobId,
    description: `Job completed: ${existing.title}`,
  });
}

export async function failJob(jobId: string, errorMessage: string): Promise<void> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { createdByUserId: true, title: true },
  });

  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "FAILED",
      failedAt: new Date(),
      errorMessage: errorMessage.slice(0, 2000),
    },
  });

  if (job) {
    const { logAudit } = await import("@/lib/services/audit");
    await logAudit({
      actorUserId: job.createdByUserId,
      action: "JOB_FAILED",
      entityType: "Job",
      entityId: jobId,
      description: `Job failed: ${job.title} — ${errorMessage.slice(0, 200)}`,
    });
  }
}

export async function getJob(jobId: string): Promise<JobItem | null> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { createdBy: { select: { name: true, email: true } } },
  });
  return job ? mapJob(job) : null;
}

export async function listJobs(
  filters: JobFilters = {},
  viewer?: { userId: string; role: UserRole }
): Promise<{
  data: JobItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.JobWhereInput = {};

  if (viewer && viewer.role === "FACULTY") {
    where.createdByUserId = viewer.userId;
  }

  if (filters.status) where.status = filters.status;
  if (filters.jobType) where.jobType = filters.jobType;

  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
    ];
  }

  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) {
      where.createdAt.gte = new Date(filters.from);
    }
    if (filters.to) {
      const end = new Date(filters.to);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const [total, jobs] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: { createdBy: { select: { name: true, email: true } } },
    }),
  ]);

  return {
    data: jobs.map(mapJob),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getRecentJobsForUser(
  userId: string,
  limit = 5
): Promise<JobItem[]> {
  const jobs = await prisma.job.findMany({
    where: { createdByUserId: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { createdBy: { select: { name: true, email: true } } },
  });
  return jobs.map(mapJob);
}

export async function getLatestJobForRequirement(
  requirementId: string
): Promise<JobItem | null> {
  const jobs = await prisma.job.findMany({
    where: { jobType: "COMPANY_MATCHING" },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { createdBy: { select: { name: true, email: true } } },
  });

  for (const job of jobs) {
    const parsed = parseResultJson(job.resultJson);
    const meta = parsed?._meta as JobMeta | undefined;
    if (meta?.requirementId === requirementId) {
      return mapJob(job);
    }
  }
  return null;
}

export function canUserViewJob(
  viewer: { userId: string; role: UserRole },
  job: { createdByUserId: string }
): boolean {
  if (viewer.role === "HR") return false;
  if (viewer.role === "SUPER_ADMIN" || viewer.role === "TPO_ADMIN") return true;
  if (viewer.role === "FACULTY") {
    return job.createdByUserId === viewer.userId;
  }
  return false;
}

export function canUserListJobs(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "TPO_ADMIN" || role === "FACULTY";
}
