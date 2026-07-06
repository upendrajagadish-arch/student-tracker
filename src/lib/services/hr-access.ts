import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { HRCompanyAccessItem, HRUserListItem } from "@/types/sharing";

const SALT_ROUNDS = 12;

export async function getHrUsers(): Promise<HRUserListItem[]> {
  const users = await prisma.user.findMany({
    where: { role: "HR" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, isActive: true },
  });
  return users;
}

export async function createHrUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<HRUserListItem> {
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: "HR",
    },
    select: { id: true, name: true, email: true, isActive: true },
  });
  return user;
}

export async function getHrAccessForCompany(
  companyId: string
): Promise<HRCompanyAccessItem[]> {
  const rows = await prisma.hRCompanyAccess.findMany({
    where: { companyId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user.name,
    userEmail: r.user.email,
    companyId: r.companyId,
    accessRole: r.accessRole as HRCompanyAccessItem["accessRole"],
    isActive: r.isActive,
    createdAt: r.createdAt,
  }));
}

export async function assignHrAccess(
  companyId: string,
  userId: string,
  accessRole: HRCompanyAccessItem["accessRole"],
  createdByUserId: string
): Promise<HRCompanyAccessItem> {
  const user = await prisma.user.findFirst({
    where: { id: userId, role: "HR" },
  });
  if (!user) throw new Error("HR user not found");

  const row = await prisma.hRCompanyAccess.upsert({
    where: { userId_companyId: { userId, companyId } },
    create: {
      userId,
      companyId,
      accessRole,
      createdByUserId,
    },
    update: {
      accessRole,
      isActive: true,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return {
    id: row.id,
    userId: row.userId,
    userName: row.user.name,
    userEmail: row.user.email,
    companyId: row.companyId,
    accessRole: row.accessRole as HRCompanyAccessItem["accessRole"],
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

export async function setHrAccessActive(
  accessId: string,
  isActive: boolean
): Promise<void> {
  await prisma.hRCompanyAccess.update({
    where: { id: accessId },
    data: { isActive },
  });
}

export async function getHrCompaniesForUser(
  userId: string
): Promise<{ id: string; name: string; accessRole: string }[]> {
  const rows = await prisma.hRCompanyAccess.findMany({
    where: { userId, isActive: true },
    include: { company: { select: { id: true, name: true, isActive: true } } },
  });
  return rows
    .filter((r) => r.company.isActive)
    .map((r) => ({
      id: r.company.id,
      name: r.company.name,
      accessRole: r.accessRole,
    }));
}

export async function verifyHrCompanyAccess(
  userId: string,
  companyId: string
): Promise<boolean> {
  const access = await prisma.hRCompanyAccess.findFirst({
    where: { userId, companyId, isActive: true },
    include: { company: { select: { isActive: true } } },
  });
  return Boolean(access?.company.isActive);
}

export async function getActiveCompanyIdsForHr(
  userId: string
): Promise<string[]> {
  const rows = await prisma.hRCompanyAccess.findMany({
    where: { userId, isActive: true },
    include: { company: { select: { isActive: true } } },
  });
  return rows.filter((r) => r.company.isActive).map((r) => r.companyId);
}
