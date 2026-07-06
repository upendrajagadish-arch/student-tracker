import { CodingPlatformsPageClientShell } from "@/components/coding-platforms/CodingPlatformsPageClient";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  canImportCodingProfiles,
  canViewCodingPlatforms,
} from "@/lib/permissions";
import {
  getActiveCodingPlatforms,
  getCodingProfileOverview,
} from "@/lib/services/coding-platforms";
import {
  getDistinctBatches,
  getDistinctBranches,
} from "@/lib/services/students";
import type {
  CodingProfileDataSource,
  CodingProfileFilters,
  CodingProfileVerificationStatus,
} from "@/types/coding-platforms";
import type { UserRole } from "@/types";
import { notFound } from "next/navigation";

export async function CodingPlatformsListPageContent({
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
  if (!canViewCodingPlatforms(role)) notFound();

  const params = await searchParams;
  const filters: CodingProfileFilters = {
    search: typeof params.search === "string" ? params.search : undefined,
    branch: typeof params.branch === "string" ? params.branch : undefined,
    batch: typeof params.batch === "string" ? params.batch : undefined,
    platformId: typeof params.platformId === "string" ? params.platformId : undefined,
    verificationStatus:
      typeof params.verificationStatus === "string"
        ? (params.verificationStatus as CodingProfileVerificationStatus)
        : undefined,
    dataSource:
      typeof params.dataSource === "string"
        ? (params.dataSource as CodingProfileDataSource)
        : undefined,
    minEvidenceScore: params.minEvidenceScore
      ? Number(params.minEvidenceScore)
      : undefined,
    page: Number(params.page) || 1,
  };

  const [result, platforms, branches, batches] = await Promise.all([
    getCodingProfileOverview(filters),
    getActiveCodingPlatforms(),
    getDistinctBranches(),
    getDistinctBatches(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coding Platforms"
        description="Track LeetCode, HackerRank, and other coding profiles via manual entry or CSV import. No live scraping."
      />
      <CodingPlatformsPageClientShell
        result={result}
        platforms={platforms}
        branches={branches}
        batches={batches}
        basePath={basePath}
        studentsBasePath={studentsBasePath}
        canImport={canImportCodingProfiles(role)}
      />
    </div>
  );
}
