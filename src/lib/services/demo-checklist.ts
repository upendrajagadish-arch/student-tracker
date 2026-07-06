import { prisma } from "@/lib/db";
import { ACTIVE_SHARE_STATUSES } from "@/lib/sharing-constants";

export interface DemoChecklistItem {
  id: string;
  label: string;
  status: "ready" | "partial" | "missing";
  detail: string;
}

export interface DemoChecklistResult {
  items: DemoChecklistItem[];
  readyCount: number;
  totalCount: number;
  isDemoReady: boolean;
}

export async function getDemoChecklistStatus(): Promise<DemoChecklistResult> {
  const [
    studentCount,
    resumeCount,
    readinessCount,
    companyCount,
    activeRequirements,
    matchCount,
    shareCount,
    hrDecisions,
    passportCount,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.resume.count({ where: { isActive: true } }),
    prisma.readinessSnapshot.count(),
    prisma.company.count({ where: { isActive: true } }),
    prisma.companyRequirement.count({ where: { status: "ACTIVE" } }),
    prisma.companyMatchSnapshot.count(),
    prisma.sharedStudentProfile.count({
      where: { shareStatus: { in: ACTIVE_SHARE_STATUSES } },
    }),
    prisma.sharedStudentProfile.count({
      where: {
        shareStatus: { in: ACTIVE_SHARE_STATUSES },
        hrDecision: { not: "PENDING" },
      },
    }),
    prisma.placementPassportSnapshot.count(),
  ]);

  const items: DemoChecklistItem[] = [
    item("students", "Students seeded", studentCount >= 80, `${studentCount} students`),
    item("resumes", "Resumes available", resumeCount >= 50, `${resumeCount} active resumes`),
    item("readiness", "Readiness calculated", readinessCount >= 50, `${readinessCount} snapshots`),
    item("companies", "Companies created", companyCount >= 4, `${companyCount} companies`),
    item("requirements", "Requirements active", activeRequirements >= 6, `${activeRequirements} active`),
    item("matching", "Matching results available", matchCount >= 100, `${matchCount} match records`),
    item("sharing", "Students shared with HR", shareCount >= 5, `${shareCount} active shares`),
    item("hr-decisions", "HR decisions recorded", hrDecisions >= 3, `${hrDecisions} decisions`),
    item("passports", "Passports generated", passportCount >= 3, `${passportCount} passports`),
    item(
      "analytics",
      "Analytics populated",
      studentCount >= 80 && matchCount > 0 && shareCount > 0,
      "Overview, funnel, and skill gaps ready"
    ),
  ];

  const readyCount = items.filter((i) => i.status === "ready").length;

  return {
    items,
    readyCount,
    totalCount: items.length,
    isDemoReady: readyCount >= 8,
  };
}

function item(
  id: string,
  label: string,
  ok: boolean,
  detail: string
): DemoChecklistItem {
  return {
    id,
    label,
    status: ok ? "ready" : "missing",
    detail,
  };
}
