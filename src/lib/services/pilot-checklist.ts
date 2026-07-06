import { prisma } from "@/lib/db";
import { ACTIVE_SHARE_STATUSES } from "@/lib/sharing-constants";
import { getServerEnv } from "@/lib/env";

export interface PilotChecklistItem {
  id: string;
  label: string;
  status: "ready" | "partial" | "missing";
  detail: string;
}

export interface PilotChecklistResult {
  items: PilotChecklistItem[];
  readyCount: number;
  totalCount: number;
  isPilotReady: boolean;
  health: {
    status: string;
    database: string;
    storage: string;
  };
  infrastructure: {
    storageProvider: string;
    databaseProvider: string;
  };
}

function item(
  id: string,
  label: string,
  ok: boolean,
  detail: string,
  partial = false
): PilotChecklistItem {
  return {
    id,
    label,
    status: ok ? "ready" : partial ? "partial" : "missing",
    detail,
  };
}

export async function getPilotChecklistStatus(): Promise<PilotChecklistResult> {
  const env = getServerEnv();
  const dbUrl = env.DATABASE_URL ?? "";
  const isPostgres = dbUrl.startsWith("postgres");

  const [
    studentCount,
    readinessCount,
    resumeCount,
    studentsWithTech,
    activeRequirements,
    matchCount,
    driveCount,
    shareCount,
    hrDecisions,
    auditReportViews,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.readinessSnapshot.count(),
    prisma.resume.count({ where: { isActive: true } }),
    prisma.studentTechSkill.findMany({ select: { studentId: true }, distinct: ["studentId"] }).then((r) => r.length),
    prisma.companyRequirement.count({ where: { status: "ACTIVE" } }),
    prisma.companyMatchSnapshot.count(),
    prisma.placementDrive.count({ where: { status: { notIn: ["ARCHIVED", "CANCELLED"] } } }),
    prisma.sharedStudentProfile.count({
      where: { shareStatus: { in: ACTIVE_SHARE_STATUSES }, revokedAt: null },
    }),
    prisma.sharedStudentProfile.count({
      where: {
        shareStatus: { in: ACTIVE_SHARE_STATUSES },
        hrDecision: { not: "PENDING" },
      },
    }),
    prisma.auditLog.count({
      where: { action: { in: ["REPORT_VIEWED", "REPORT_EXPORTED"] } },
    }),
  ]);

  const resumeCoverage =
    studentCount > 0 ? Math.round((resumeCount / studentCount) * 100) : 0;
  const techCoverage =
    studentCount > 0 ? Math.round((studentsWithTech / studentCount) * 100) : 0;
  const readinessCoverage =
    studentCount > 0 ? Math.round((readinessCount / studentCount) * 100) : 0;

  let health = { status: "unknown", database: "unknown", storage: "unknown" };
  try {
    await prisma.$queryRaw`SELECT 1`;
    health = {
      status: "ok",
      database: "ok",
      storage: env.STORAGE_PROVIDER === "s3" ? "s3-configured" : "local",
    };
  } catch {
    health = { status: "degraded", database: "error", storage: "unknown" };
  }

  const items: PilotChecklistItem[] = [
    item(
      "students",
      "Total students",
      studentCount >= 100,
      `${studentCount.toLocaleString()} students (${studentCount >= 5000 ? "pilot scale" : "demo scale"})`,
      studentCount >= 50
    ),
    item(
      "readiness",
      "Readiness snapshots",
      readinessCoverage >= 80,
      `${readinessCount.toLocaleString()} snapshots (${readinessCoverage}% coverage)`,
      readinessCoverage >= 40
    ),
    item(
      "resumes",
      "Resume coverage",
      resumeCoverage >= 60,
      `${resumeCount.toLocaleString()} active resumes (${resumeCoverage}% of students)`,
      resumeCoverage >= 30
    ),
    item(
      "techstack",
      "Tech stack coverage",
      techCoverage >= 70,
      `${studentsWithTech.toLocaleString()} students with skills (${techCoverage}%)`,
      techCoverage >= 40
    ),
    item(
      "requirements",
      "Active requirements",
      activeRequirements >= 4,
      `${activeRequirements} active company requirements`
    ),
    item(
      "matching",
      "Matching results",
      matchCount >= studentCount,
      `${matchCount.toLocaleString()} match records`,
      matchCount > 0
    ),
    item(
      "drives",
      "Placement drives",
      driveCount >= 1,
      `${driveCount} active/upcoming drives`
    ),
    item(
      "hr-sharing",
      "HR sharing tested",
      shareCount >= 10 && hrDecisions >= 5,
      `${shareCount} shares, ${hrDecisions} HR decisions`,
      shareCount > 0
    ),
    item(
      "reports",
      "Reports available",
      auditReportViews > 0 || matchCount > 0,
      auditReportViews > 0
        ? `${auditReportViews} report views/exports logged`
        : "Reports module ready — open /admin/reports to verify"
    ),
    item(
      "analytics",
      "Analytics populated",
      studentCount >= 100 && matchCount > 0,
      "Dashboard metrics derive from student and match data"
    ),
    item(
      "health",
      "Health endpoint",
      health.status === "ok",
      `API ${health.status}, DB ${health.database}, storage ${health.storage}`
    ),
    item(
      "database",
      "Database provider",
      isPostgres,
      isPostgres ? "PostgreSQL (recommended for pilot)" : "SQLite (dev/demo only)",
      !isPostgres
    ),
    item(
      "storage",
      "Storage provider",
      env.STORAGE_PROVIDER === "s3" || env.NODE_ENV !== "production",
      env.STORAGE_PROVIDER === "s3"
        ? "S3-compatible storage configured"
        : "Local uploads (set STORAGE_PROVIDER=s3 for production)",
      env.STORAGE_PROVIDER === "local"
    ),
  ];

  const readyCount = items.filter((i) => i.status === "ready").length;

  return {
    items,
    readyCount,
    totalCount: items.length,
    isPilotReady: readyCount >= 10 && studentCount >= 100,
    health,
    infrastructure: {
      storageProvider: env.STORAGE_PROVIDER,
      databaseProvider: isPostgres ? "postgresql" : "sqlite",
    },
  };
}
