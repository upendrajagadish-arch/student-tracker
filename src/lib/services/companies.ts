import { prisma } from "@/lib/db";
import type { CompanyInput, CompanyRequirementInput } from "@/lib/validations/company";
import type {
  CompanyDetail,
  CompanyListItem,
  CompanyRequirementDetail,
  CompanyRequirementListItem,
} from "@/types/company";
import type { PaginatedResult } from "@/types";
import { Prisma } from "@prisma/client";

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function mapRequirementDetail(
  req: {
    id: string;
    companyId: string;
    roleTitle: string;
    jobType: string | null;
    eligibleBranchesJson: string;
    eligibleBatchesJson: string;
    graduationYear: number | null;
    minCgpa: number | null;
    allowActiveBacklogs: boolean;
    maxActiveBacklogs: number;
    requiredSkillsJson: string;
    preferredSkillsJson: string;
    requiredRoleInterestsJson: string;
    minTechnicalScore: number;
    minCommunicationScore: number;
    minResumeScore: number;
    minReadinessScore: number;
    requireResumeApproved: boolean;
    requireAtsFriendly: boolean;
    requireLinkedIn: boolean;
    requireGitHub: boolean;
    notes: string | null;
    status: string;
    createdByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
    company?: { name: string };
  }
): CompanyRequirementDetail {
  return {
    id: req.id,
    companyId: req.companyId,
    companyName: req.company?.name ?? "",
    roleTitle: req.roleTitle,
    jobType: req.jobType,
    eligibleBranches: parseJsonArray(req.eligibleBranchesJson),
    eligibleBatches: parseJsonArray(req.eligibleBatchesJson),
    graduationYear: req.graduationYear,
    minCgpa: req.minCgpa,
    allowActiveBacklogs: req.allowActiveBacklogs,
    maxActiveBacklogs: req.maxActiveBacklogs,
    requiredSkills: parseJsonArray(req.requiredSkillsJson),
    preferredSkills: parseJsonArray(req.preferredSkillsJson),
    requiredRoleInterests: parseJsonArray(req.requiredRoleInterestsJson),
    minTechnicalScore: req.minTechnicalScore,
    minCommunicationScore: req.minCommunicationScore,
    minResumeScore: req.minResumeScore,
    minReadinessScore: req.minReadinessScore,
    requireResumeApproved: req.requireResumeApproved,
    requireAtsFriendly: req.requireAtsFriendly,
    requireLinkedIn: req.requireLinkedIn,
    requireGitHub: req.requireGitHub,
    notes: req.notes,
    status: req.status as CompanyRequirementDetail["status"],
    createdByUserId: req.createdByUserId,
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
  };
}

function buildRequirementData(input: CompanyRequirementInput) {
  return {
    companyId: input.companyId,
    roleTitle: input.roleTitle,
    jobType: input.jobType || null,
    eligibleBranchesJson: JSON.stringify(input.eligibleBranches ?? []),
    eligibleBatchesJson: JSON.stringify(input.eligibleBatches ?? []),
    graduationYear: input.graduationYear ?? null,
    minCgpa: input.minCgpa ?? null,
    allowActiveBacklogs: input.allowActiveBacklogs ?? false,
    maxActiveBacklogs: input.maxActiveBacklogs ?? 0,
    requiredSkillsJson: JSON.stringify(input.requiredSkills ?? []),
    preferredSkillsJson: JSON.stringify(input.preferredSkills ?? []),
    requiredRoleInterestsJson: JSON.stringify(
      input.requiredRoleInterests ?? []
    ),
    minTechnicalScore: input.minTechnicalScore ?? 0,
    minCommunicationScore: input.minCommunicationScore ?? 0,
    minResumeScore: input.minResumeScore ?? 0,
    minReadinessScore: input.minReadinessScore ?? 0,
    requireResumeApproved: input.requireResumeApproved ?? false,
    requireAtsFriendly: input.requireAtsFriendly ?? false,
    requireLinkedIn: input.requireLinkedIn ?? false,
    requireGitHub: input.requireGitHub ?? false,
    notes: input.notes || null,
    status: input.status ?? "DRAFT",
  };
}

export async function getCompanies(options?: {
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<CompanyListItem>> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options?.pageSize ?? 12));
  const skip = (page - 1) * pageSize;

  const where: Prisma.CompanyWhereInput = {};
  if (options?.search) {
    where.name = { contains: options.search.trim() };
  }
  if (options?.isActive != null) where.isActive = options.isActive;

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
      include: {
        requirements: { select: { id: true, status: true } },
      },
    }),
    prisma.company.count({ where }),
  ]);

  return {
    data: companies.map((c) => ({
      id: c.id,
      name: c.name,
      website: c.website,
      industry: c.industry,
      location: c.location,
      contactPerson: c.contactPerson,
      contactEmail: c.contactEmail,
      contactPhone: c.contactPhone,
      notes: c.notes,
      isActive: c.isActive,
      requirementCount: c.requirements.length,
      activeRequirementCount: c.requirements.filter(
        (r) => r.status === "ACTIVE"
      ).length,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getCompanyById(id: string): Promise<CompanyDetail | null> {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      requirements: {
        orderBy: { createdAt: "desc" },
        include: {
          company: { select: { name: true } },
          _count: { select: { matches: true } },
        },
      },
    },
  });
  if (!company) return null;

  const requirementIds = company.requirements.map((r) => r.id);
  const strongFitCounts =
    requirementIds.length > 0
      ? await prisma.companyMatchSnapshot.groupBy({
          by: ["companyRequirementId"],
          where: {
            companyRequirementId: { in: requirementIds },
            matchStatus: "STRONG_FIT",
          },
          _count: { id: true },
        })
      : [];
  const strongFitMap = new Map(
    strongFitCounts.map((g) => [g.companyRequirementId, g._count.id])
  );

  return {
    id: company.id,
    name: company.name,
    website: company.website,
    industry: company.industry,
    location: company.location,
    contactPerson: company.contactPerson,
    contactEmail: company.contactEmail,
    contactPhone: company.contactPhone,
    notes: company.notes,
    isActive: company.isActive,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
    requirements: company.requirements.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      companyName: company.name,
      roleTitle: r.roleTitle,
      jobType: r.jobType,
      status: r.status as CompanyRequirementListItem["status"],
      graduationYear: r.graduationYear,
      minCgpa: r.minCgpa,
      matchCount: r._count.matches,
      strongFitCount: strongFitMap.get(r.id) ?? 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  };
}

export async function createCompany(input: CompanyInput): Promise<CompanyListItem> {
  const company = await prisma.company.create({
    data: {
      name: input.name,
      website: input.website ?? null,
      industry: input.industry || null,
      location: input.location || null,
      contactPerson: input.contactPerson || null,
      contactEmail: input.contactEmail ?? null,
      contactPhone: input.contactPhone || null,
      notes: input.notes || null,
      isActive: input.isActive ?? true,
    },
    include: { requirements: { select: { id: true, status: true } } },
  });

  return {
    id: company.id,
    name: company.name,
    website: company.website,
    industry: company.industry,
    location: company.location,
    contactPerson: company.contactPerson,
    contactEmail: company.contactEmail,
    contactPhone: company.contactPhone,
    notes: company.notes,
    isActive: company.isActive,
    requirementCount: 0,
    activeRequirementCount: 0,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

export async function updateCompany(
  id: string,
  input: CompanyInput
): Promise<CompanyListItem> {
  const company = await prisma.company.update({
    where: { id },
    data: {
      name: input.name,
      website: input.website ?? null,
      industry: input.industry || null,
      location: input.location || null,
      contactPerson: input.contactPerson || null,
      contactEmail: input.contactEmail ?? null,
      contactPhone: input.contactPhone || null,
      notes: input.notes || null,
      isActive: input.isActive ?? true,
    },
    include: { requirements: { select: { id: true, status: true } } },
  });

  return {
    id: company.id,
    name: company.name,
    website: company.website,
    industry: company.industry,
    location: company.location,
    contactPerson: company.contactPerson,
    contactEmail: company.contactEmail,
    contactPhone: company.contactPhone,
    notes: company.notes,
    isActive: company.isActive,
    requirementCount: company.requirements.length,
    activeRequirementCount: company.requirements.filter(
      (r) => r.status === "ACTIVE"
    ).length,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

export async function setCompanyActive(
  id: string,
  isActive: boolean
): Promise<void> {
  await prisma.company.update({ where: { id }, data: { isActive } });
}

export async function getRequirements(options?: {
  companyId?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<CompanyRequirementListItem>> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options?.pageSize ?? 12));
  const skip = (page - 1) * pageSize;

  const where: Prisma.CompanyRequirementWhereInput = {};
  if (options?.companyId) where.companyId = options.companyId;
  if (options?.status) where.status = options.status as never;
  if (options?.search) {
    where.OR = [
      { roleTitle: { contains: options.search.trim() } },
      { company: { name: { contains: options.search.trim() } } },
    ];
  }

  const [requirements, total] = await Promise.all([
    prisma.companyRequirement.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
      include: {
        company: { select: { name: true } },
        _count: { select: { matches: true } },
      },
    }),
    prisma.companyRequirement.count({ where }),
  ]);

  const reqIds = requirements.map((r) => r.id);
  const strongFitCounts =
    reqIds.length > 0
      ? await prisma.companyMatchSnapshot.groupBy({
          by: ["companyRequirementId"],
          where: {
            companyRequirementId: { in: reqIds },
            matchStatus: "STRONG_FIT",
          },
          _count: { id: true },
        })
      : [];
  const strongFitMap = new Map(
    strongFitCounts.map((g) => [g.companyRequirementId, g._count.id])
  );

  return {
    data: requirements.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      companyName: r.company.name,
      roleTitle: r.roleTitle,
      jobType: r.jobType,
      status: r.status as CompanyRequirementListItem["status"],
      graduationYear: r.graduationYear,
      minCgpa: r.minCgpa,
      matchCount: r._count.matches,
      strongFitCount: strongFitMap.get(r.id) ?? 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getRequirementById(
  id: string
): Promise<CompanyRequirementDetail | null> {
  const req = await prisma.companyRequirement.findUnique({
    where: { id },
    include: { company: { select: { name: true } } },
  });
  return req ? mapRequirementDetail(req) : null;
}

export async function createRequirement(
  input: CompanyRequirementInput,
  createdByUserId?: string
): Promise<CompanyRequirementDetail> {
  const req = await prisma.companyRequirement.create({
    data: {
      ...buildRequirementData(input),
      createdByUserId: createdByUserId ?? null,
    },
    include: { company: { select: { name: true } } },
  });
  return mapRequirementDetail(req);
}

export async function updateRequirement(
  id: string,
  input: CompanyRequirementInput
): Promise<CompanyRequirementDetail> {
  const req = await prisma.companyRequirement.update({
    where: { id },
    data: buildRequirementData(input),
    include: { company: { select: { name: true } } },
  });
  return mapRequirementDetail(req);
}

export async function updateRequirementStatus(
  id: string,
  status: CompanyRequirementDetail["status"]
): Promise<CompanyRequirementDetail> {
  const req = await prisma.companyRequirement.update({
    where: { id },
    data: { status },
    include: { company: { select: { name: true } } },
  });
  return mapRequirementDetail(req);
}

export async function getActiveCompaniesForSelect(): Promise<
  { id: string; name: string }[]
> {
  return prisma.company.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export function isPrismaNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}
