import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ROLE_READINESS_LABELS, VERIFIED_STATUSES } from "@/lib/tech-constants";
import type {
  StudentTechStackSummary,
  TechStackDashboardStats,
  TechStackFilters,
} from "@/types/tech-stack";
import type { PaginatedResult } from "@/types";
import type {
  ProficiencyLevel,
  SkillCategory,
  StudentRoleInterestItem,
  StudentTechSkillItem,
  TechSkillItem,
  VerificationStatus,
} from "@/types/tech-stack";
import type {
  RoleInterestInput,
  StudentTechSkillInput,
  TechSkillMasterInput,
} from "@/lib/validations/tech-stack";

export async function getActiveTechSkills(): Promise<TechSkillItem[]> {
  const skills = await prisma.techSkill.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return skills.map(mapTechSkill);
}

export async function getAllTechSkills(): Promise<TechSkillItem[]> {
  const skills = await prisma.techSkill.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return skills.map(mapTechSkill);
}

export async function createTechSkill(
  input: TechSkillMasterInput
): Promise<TechSkillItem> {
  const skill = await prisma.techSkill.create({
    data: {
      name: input.name.trim(),
      category: input.category,
      isActive: input.isActive ?? true,
    },
  });
  return mapTechSkill(skill);
}

export async function updateTechSkill(
  id: string,
  input: Partial<TechSkillMasterInput>
): Promise<TechSkillItem> {
  const skill = await prisma.techSkill.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
  return mapTechSkill(skill);
}

export async function getStudentTechSkills(
  studentId: string
): Promise<StudentTechSkillItem[]> {
  const skills = await prisma.studentTechSkill.findMany({
    where: { studentId },
    include: { techSkill: true },
    orderBy: [{ techSkill: { category: "asc" } }, { techSkill: { name: "asc" } }],
  });

  const userIds = [
    ...new Set(
      skills.flatMap((s) => [s.addedByUserId, s.verifiedByUserId]).filter(Boolean)
    ),
  ] as string[];

  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
      : [];
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  return skills.map((s) => ({
    id: s.id,
    studentId: s.studentId,
    techSkillId: s.techSkillId,
    skillName: s.techSkill.name,
    skillCategory: s.techSkill.category as SkillCategory,
    proficiencyLevel: s.proficiencyLevel as ProficiencyLevel,
    verificationStatus: s.verificationStatus as VerificationStatus,
    evidenceSource: s.evidenceSource,
    notes: s.notes,
    addedByUserId: s.addedByUserId,
    verifiedByUserId: s.verifiedByUserId,
    verifiedAt: s.verifiedAt,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    addedByName: userMap.get(s.addedByUserId) ?? null,
    verifiedByName: s.verifiedByUserId
      ? userMap.get(s.verifiedByUserId) ?? null
      : null,
  }));
}

export async function addStudentTechSkill(
  studentId: string,
  input: StudentTechSkillInput,
  addedByUserId: string
): Promise<StudentTechSkillItem> {
  await prisma.studentTechSkill.create({
    data: {
      studentId,
      techSkillId: input.techSkillId,
      proficiencyLevel: input.proficiencyLevel ?? "BEGINNER",
      verificationStatus: input.verificationStatus ?? "NOT_VERIFIED",
      evidenceSource: input.evidenceSource ?? null,
      notes: input.notes ?? null,
      addedByUserId,
    },
  });
  const skills = await getStudentTechSkills(studentId);
  return skills.find((s) => s.techSkillId === input.techSkillId)!;
}

export async function updateStudentTechSkill(
  id: string,
  input: Partial<StudentTechSkillInput> & {
    verificationStatus?: VerificationStatus;
  },
  actorUserId?: string
): Promise<StudentTechSkillItem> {
  const existing = await prisma.studentTechSkill.findUnique({ where: { id } });
  if (!existing) throw new Error("Skill not found");

  const isVerifying =
    input.verificationStatus &&
    VERIFIED_STATUSES.includes(input.verificationStatus);

  await prisma.studentTechSkill.update({
    where: { id },
    data: {
      ...(input.techSkillId && { techSkillId: input.techSkillId }),
      ...(input.proficiencyLevel && {
        proficiencyLevel: input.proficiencyLevel,
      }),
      ...(input.verificationStatus && {
        verificationStatus: input.verificationStatus,
      }),
      ...(input.evidenceSource !== undefined && {
        evidenceSource: input.evidenceSource ?? null,
      }),
      ...(input.notes !== undefined && { notes: input.notes ?? null }),
      ...(isVerifying && {
        verifiedByUserId: actorUserId ?? null,
        verifiedAt: new Date(),
      }),
    },
  });

  const skills = await getStudentTechSkills(existing.studentId);
  return skills.find((s) => s.id === id)!;
}

export async function removeStudentTechSkill(id: string): Promise<void> {
  await prisma.studentTechSkill.delete({ where: { id } });
}

export async function getStudentRoleInterests(
  studentId: string
): Promise<StudentRoleInterestItem[]> {
  const items = await prisma.studentRoleInterest.findMany({
    where: { studentId },
    orderBy: { roleName: "asc" },
  });
  return items.map(mapRoleInterest);
}

export async function addRoleInterest(
  studentId: string,
  input: RoleInterestInput
): Promise<StudentRoleInterestItem> {
  const item = await prisma.studentRoleInterest.create({
    data: {
      studentId,
      roleName: input.roleName.trim(),
      interestLevel: input.interestLevel ?? "MEDIUM",
      readinessLevel: input.readinessLevel ?? "NOT_READY",
      notes: input.notes ?? null,
    },
  });
  return mapRoleInterest(item);
}

export async function updateRoleInterest(
  id: string,
  input: Partial<RoleInterestInput>
): Promise<StudentRoleInterestItem> {
  const item = await prisma.studentRoleInterest.update({
    where: { id },
    data: {
      ...(input.roleName && { roleName: input.roleName.trim() }),
      ...(input.interestLevel && { interestLevel: input.interestLevel }),
      ...(input.readinessLevel && { readinessLevel: input.readinessLevel }),
      ...(input.notes !== undefined && { notes: input.notes ?? null }),
    },
  });
  return mapRoleInterest(item);
}

export async function removeRoleInterest(id: string): Promise<void> {
  await prisma.studentRoleInterest.delete({ where: { id } });
}

export async function getTechStackOverview(
  filters: TechStackFilters = {}
): Promise<PaginatedResult<StudentTechStackSummary>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 10));

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

  const skillWhere: Prisma.StudentTechSkillWhereInput = {};
  if (filters.techSkillId) skillWhere.techSkillId = filters.techSkillId;
  if (filters.proficiencyLevel)
    skillWhere.proficiencyLevel = filters.proficiencyLevel;
  if (filters.verificationStatus)
    skillWhere.verificationStatus = filters.verificationStatus;
  if (filters.category) {
    skillWhere.techSkill = { category: filters.category };
  }

  if (Object.keys(skillWhere).length > 0) {
    studentWhere.techSkills = { some: skillWhere };
  }

  if (filters.roleInterest) {
    studentWhere.roleInterests = {
      some: { roleName: { contains: filters.roleInterest } },
    };
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where: studentWhere,
      include: {
        techSkills: { include: { techSkill: true } },
        roleInterests: true,
      },
      orderBy: { fullName: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.student.count({ where: studentWhere }),
  ]);

  const data: StudentTechStackSummary[] = students.map((s) => {
    const verified = s.techSkills.filter((sk) =>
      VERIFIED_STATUSES.includes(sk.verificationStatus as VerificationStatus)
    );
    const sorted = [...s.techSkills].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
    const topSkills = s.techSkills
      .slice(0, 3)
      .map((sk) => sk.techSkill.name);
    const lastUpdated =
      sorted[0]?.updatedAt ??
      s.roleInterests.sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
      )[0]?.updatedAt ??
      null;

    return {
      studentId: s.id,
      fullName: s.fullName,
      rollNumber: s.rollNumber,
      branch: s.branch,
      batch: s.batch,
      skillsCount: s.techSkills.length,
      verifiedSkillsCount: verified.length,
      topSkills,
      roleInterests: s.roleInterests.map((r) => r.roleName),
      lastUpdated,
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

export async function getTechStackDashboardStats(): Promise<TechStackDashboardStats> {
  const studentsWithSkills = await prisma.student.count({
    where: { techSkills: { some: {} } },
  });

  const verifiedCounts = await prisma.studentTechSkill.groupBy({
    by: ["studentId"],
    where: {
      verificationStatus: { in: VERIFIED_STATUSES },
    },
    _count: { id: true },
  });

  const avgVerified =
    verifiedCounts.length > 0
      ? verifiedCounts.reduce((sum, v) => sum + v._count.id, 0) /
        verifiedCounts.length
      : 0;

  const skillCounts = await prisma.studentTechSkill.groupBy({
    by: ["techSkillId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });

  const skillIds = skillCounts.map((s) => s.techSkillId);
  const skillNames = await prisma.techSkill.findMany({
    where: { id: { in: skillIds } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(skillNames.map((s) => [s.id, s.name]));

  const categoryCounts = await prisma.studentTechSkill.groupBy({
    by: ["techSkillId"],
    _count: { id: true },
  });

  const allSkills = await prisma.techSkill.findMany({
    where: {
      id: { in: categoryCounts.map((c) => c.techSkillId) },
    },
    select: { id: true, category: true },
  });
  const catMap = new Map(allSkills.map((s) => [s.id, s.category]));

  const categoryTotals = new Map<string, number>();
  for (const row of categoryCounts) {
    const cat = catMap.get(row.techSkillId) ?? "OTHER";
    categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + row._count.id);
  }

  return {
    studentsWithTechStack: studentsWithSkills,
    avgVerifiedSkillsPerStudent: Math.round(avgVerified * 10) / 10,
    topSkills: skillCounts.map((s) => ({
      name: nameMap.get(s.techSkillId) ?? "Unknown",
      count: s._count.id,
    })),
    categoryDistribution: [...categoryTotals.entries()]
      .map(([category, count]) => ({
        category: category as SkillCategory,
        count,
      }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function getStudentTechExportSummary(studentId: string) {
  const [skills, interests] = await Promise.all([
    getStudentTechSkills(studentId),
    getStudentRoleInterests(studentId),
  ]);

  const verified = skills.filter((s) =>
    VERIFIED_STATUSES.includes(s.verificationStatus)
  );

  const topSkills = skills
    .slice(0, 5)
    .map((s) => s.skillName)
    .join(", ");

  const primaryRole =
    interests.find((r) => r.interestLevel === "HIGH") ??
    interests[0] ??
    null;

  return {
    topTechSkills: topSkills || "—",
    verifiedSkillsCount: verified.length,
    primaryRoleInterest: primaryRole?.roleName ?? "—",
    roleReadinessLevel: primaryRole
      ? ROLE_READINESS_LABELS[primaryRole.readinessLevel]
      : "—",
  };
}

function mapTechSkill(skill: {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): TechSkillItem {
  return {
    ...skill,
    category: skill.category as SkillCategory,
  };
}

function mapRoleInterest(item: {
  id: string;
  studentId: string;
  roleName: string;
  interestLevel: string;
  readinessLevel: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): StudentRoleInterestItem {
  return {
    ...item,
    interestLevel: item.interestLevel as StudentRoleInterestItem["interestLevel"],
    readinessLevel:
      item.readinessLevel as StudentRoleInterestItem["readinessLevel"],
  };
}
