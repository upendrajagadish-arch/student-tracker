import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getResumeStats } from "@/lib/services/resumes";
import { getTechStackDashboardStats } from "@/lib/services/tech-stack";
import { getReadinessDashboardStats } from "@/lib/services/readiness";
import { getCompanyMatchingDashboardStats } from "@/lib/services/company-matching";
import { getGitHubDashboardStats } from "@/lib/services/github";
import { getCodingDashboardStats } from "@/lib/services/coding-platforms";
import { getSkillEvidenceDashboardStats } from "@/lib/services/skill-evidence";
import type { StudentInput } from "@/lib/validations/student";
import type {
  DashboardStats,
  PaginatedResult,
  PlacementStatus,
  StudentFilters,
  StudentListItem,
} from "@/types";

function mapStudent(student: {
  id: string;
  fullName: string;
  rollNumber: string;
  email: string;
  phone: string | null;
  branch: string;
  section: string | null;
  batch: string;
  graduationYear: number;
  cgpa: number | null;
  activeBacklogs: number;
  placementStatus: string;
  linkedinUrl: string | null;
  githubUrl: string | null;
  resumeStatus: string;
  technicalScore: number;
  communicationScore: number;
  readinessScore: number;
  createdAt: Date;
  updatedAt: Date;
}): StudentListItem {
  return {
    ...student,
    placementStatus: student.placementStatus as StudentListItem["placementStatus"],
    resumeStatus: student.resumeStatus as StudentListItem["resumeStatus"],
  };
}

function buildStudentData(input: StudentInput) {
  const technical = input.technicalScore ?? 0;
  const communication = input.communicationScore ?? 0;

  return {
    fullName: input.fullName,
    rollNumber: input.rollNumber,
    email: input.email.toLowerCase(),
    phone: input.phone ?? null,
    branch: input.branch,
    section: input.section ?? null,
    batch: input.batch,
    graduationYear: input.graduationYear,
    cgpa: input.cgpa ?? null,
    activeBacklogs: input.activeBacklogs ?? 0,
    placementStatus: input.placementStatus ?? "NOT_STARTED",
    linkedinUrl: input.linkedinUrl ?? null,
    githubUrl: input.githubUrl ?? null,
    resumeStatus: input.resumeStatus ?? "NOT_UPLOADED",
    technicalScore: technical,
    communicationScore: communication,
  };
}

export function buildStudentWhereClause(
  filters: StudentFilters = {}
): Prisma.StudentWhereInput {
  const where: Prisma.StudentWhereInput = {};

  if (filters.search) {
    const search = filters.search.trim();
    where.OR = [
      { fullName: { contains: search } },
      { rollNumber: { contains: search } },
      { email: { contains: search } },
    ];
  }

  if (filters.branch) {
    where.branch = filters.branch;
  }

  if (filters.batch) {
    where.batch = filters.batch;
  }

  if (filters.placementStatus) {
    where.placementStatus = filters.placementStatus;
  }

  return where;
}

export async function getStudents(
  filters: StudentFilters = {}
): Promise<PaginatedResult<StudentListItem>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 10));
  const skip = (page - 1) * pageSize;

  const where = buildStudentWhereClause(filters);

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.student.count({ where }),
  ]);

  return {
    data: students.map(mapStudent),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getStudentById(
  id: string
): Promise<StudentListItem | null> {
  const student = await prisma.student.findUnique({ where: { id } });
  return student ? mapStudent(student) : null;
}

export async function createStudent(
  input: StudentInput
): Promise<StudentListItem> {
  const student = await prisma.student.create({
    data: buildStudentData(input),
  });
  return mapStudent(student);
}

export async function updateStudent(
  id: string,
  input: StudentInput
): Promise<StudentListItem> {
  const student = await prisma.student.update({
    where: { id },
    data: buildStudentData(input),
  });
  return mapStudent(student);
}

export async function updateStudentScores(
  id: string,
  technicalScore: number,
  communicationScore: number
): Promise<StudentListItem> {
  const student = await prisma.student.update({
    where: { id },
    data: { technicalScore, communicationScore },
  });
  return mapStudent(student);
}

export async function deleteStudent(id: string): Promise<void> {
  await prisma.student.delete({ where: { id } });
}

export async function getDistinctBranches(): Promise<string[]> {
  const results = await prisma.student.findMany({
    select: { branch: true },
    distinct: ["branch"],
    orderBy: { branch: "asc" },
  });
  return results.map((r) => r.branch);
}

export async function getDistinctBatches(): Promise<string[]> {
  const results = await prisma.student.findMany({
    select: { batch: true },
    distinct: ["batch"],
    orderBy: { batch: "desc" },
  });
  return results.map((r) => r.batch);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    totalStudents,
    placementReady,
    needsAttention,
    resumeStats,
    techStats,
    readinessStats,
    companyMatchingStats,
    aggregates,
    githubStats,
    codingStats,
    evidenceStats,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({ where: { placementStatus: "READY" } }),
    prisma.student.count({ where: { placementStatus: "NEEDS_ATTENTION" } }),
    getResumeStats(),
    getTechStackDashboardStats(),
    getReadinessDashboardStats(),
    getCompanyMatchingDashboardStats(),
    prisma.student.aggregate({
      _avg: {
        technicalScore: true,
        communicationScore: true,
      },
    }),
    getGitHubDashboardStats(),
    getCodingDashboardStats(),
    getSkillEvidenceDashboardStats(),
  ]);

  return {
    totalStudents,
    placementReady,
    needsAttention,
    resumeUploaded: resumeStats.resumeUploaded,
    resumeApproved: resumeStats.resumeApproved,
    avgResumeScore: resumeStats.avgResumeScore,
    avgTechnicalScore: aggregates._avg.technicalScore ?? 0,
    avgCommunicationScore: aggregates._avg.communicationScore ?? 0,
    studentsWithTechStack: techStats.studentsWithTechStack,
    avgVerifiedSkillsPerStudent: techStats.avgVerifiedSkillsPerStudent,
    topSkills: techStats.topSkills,
    categoryDistribution: techStats.categoryDistribution,
    readinessPlacementReady: readinessStats.placementReadyCount,
    readinessHighRisk: readinessStats.highRiskCount,
    readinessAvgScore: readinessStats.avgReadinessScore,
    readinessStatusDistribution: readinessStats.statusDistribution.map((s) => ({
      status: s.status,
      count: s.count,
    })),
    readinessRiskDistribution: readinessStats.riskDistribution.map((r) => ({
      risk: r.risk,
      count: r.count,
    })),
    readinessTopGaps: readinessStats.topGaps,
    activeCompanyRequirements: companyMatchingStats.activeRequirements,
    strongMatchesThisMonth: companyMatchingStats.strongMatchesThisMonth,
    topMissingSkillsAcrossRequirements:
      companyMatchingStats.topMissingSkills,
    studentsWithGitHubSynced: githubStats.studentsWithGitHubSynced,
    avgGitHubEvidenceScore: githubStats.avgGitHubEvidenceScore,
    topGitHubLanguages: githubStats.topGitHubLanguages,
    recentlyActiveGitHubStudents: githubStats.recentlyActiveStudents.map((s) => ({
      fullName: s.fullName,
      rollNumber: s.rollNumber,
    })),
    studentsWithCodingProfiles: codingStats.studentsWithCodingProfiles,
    avgCodingEvidenceScore: codingStats.avgCodingEvidenceScore,
    topCodingPlatforms: codingStats.topPlatforms,
    inactiveCodingProfiles: codingStats.inactiveProfiles,
    studentsWithStrongEvidence: evidenceStats.studentsWithStrongEvidence,
    topWeaklyEvidencedSkills: evidenceStats.weaklyEvidencedSkills,
    topVerifiedEvidenceSkills: evidenceStats.topVerifiedSkills,
  };
}

export function isPrismaUniqueError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export function getUniqueFieldMessage(error: unknown): string {
  if (!isPrismaUniqueError(error)) return "An unexpected error occurred.";
  const target = (error as Prisma.PrismaClientKnownRequestError).meta?.target;
  if (Array.isArray(target)) {
    if (target.includes("rollNumber")) return "Roll number already exists.";
    if (target.includes("email")) return "Email already exists.";
  }
  return "A record with this value already exists.";
}

export type { PlacementStatus };
