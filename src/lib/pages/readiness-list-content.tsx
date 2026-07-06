import { ReadinessPageClient } from "@/components/readiness/ReadinessPageClient";
import {
  canRecalculateReadiness,
  canViewReadiness,
  getRolePrefix,
} from "@/lib/permissions";
import { getReadinessOverview } from "@/lib/services/readiness";
import {
  getDistinctBatches,
  getDistinctBranches,
} from "@/lib/services/students";
import type { ReadinessFilters, ReadinessStatus, RiskLevel } from "@/types/readiness";
import type { UserRole } from "@/types";
import { notFound } from "next/navigation";

export async function ReadinessListPageContent({
  role,
  basePath,
  studentsBasePath,
  searchParams,
}: {
  role: UserRole;
  basePath: string;
  studentsBasePath: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!canViewReadiness(role)) notFound();

  const params = await searchParams;
  const filters: ReadinessFilters = {
    search: typeof params.search === "string" ? params.search : undefined,
    branch: typeof params.branch === "string" ? params.branch : undefined,
    batch: typeof params.batch === "string" ? params.batch : undefined,
    riskLevel:
      typeof params.riskLevel === "string"
        ? (params.riskLevel as RiskLevel)
        : undefined,
    readinessStatus:
      typeof params.readinessStatus === "string"
        ? (params.readinessStatus as ReadinessStatus)
        : undefined,
    minScore: params.minScore ? Number(params.minScore) : undefined,
    maxScore: params.maxScore ? Number(params.maxScore) : undefined,
    page: Number(params.page) || 1,
  };

  const [result, branches, batches] = await Promise.all([
    getReadinessOverview(filters),
    getDistinctBranches(),
    getDistinctBatches(),
  ]);

  return (
    <ReadinessPageClient
      result={result}
      branches={branches}
      batches={batches}
      basePath={basePath}
      jobsBasePath={`${getRolePrefix(role)}/jobs`}
      studentsBasePath={studentsBasePath}
      canRecalculate={canRecalculateReadiness(role)}
    />
  );
}
