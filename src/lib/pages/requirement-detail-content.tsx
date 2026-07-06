import { RequirementDetailClient } from "@/components/companies/RequirementDetailClient";
import {
  canExportMatching,
  canManageDrives,
  canManageRequirements,
  canManageSharing,
  canRunMatching,
  canViewRequirements,
  getRolePrefix,
} from "@/lib/permissions";
import { getRequirementById } from "@/lib/services/companies";
import {
  getMatchSummary,
  getRequirementMatches,
} from "@/lib/services/company-matching";
import { getLatestJobForRequirement, canUserListJobs } from "@/lib/services/jobs";
import { getDrivesByRequirement } from "@/lib/services/placement-drives";
import {
  getDistinctBatches,
  getDistinctBranches,
} from "@/lib/services/students";
import type { EligibilityStatus, MatchStatus } from "@/types/company";
import type { UserRole } from "@/types";
import { notFound } from "next/navigation";

export async function RequirementDetailPageContent({
  companyId,
  requirementId,
  role,
  companiesBasePath,
  studentsBasePath,
  searchParams,
}: {
  companyId: string;
  requirementId: string;
  role: UserRole;
  companiesBasePath: string;
  studentsBasePath: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!canViewRequirements(role)) notFound();

  const requirement = await getRequirementById(requirementId);
  if (!requirement || requirement.companyId !== companyId) notFound();

  const params = await searchParams;
  const filters = {
    search: typeof params.search === "string" ? params.search : undefined,
    matchStatus:
      typeof params.matchStatus === "string"
        ? (params.matchStatus as MatchStatus)
        : undefined,
    eligibilityStatus:
      typeof params.eligibilityStatus === "string"
        ? (params.eligibilityStatus as EligibilityStatus)
        : undefined,
    branch: typeof params.branch === "string" ? params.branch : undefined,
    batch: typeof params.batch === "string" ? params.batch : undefined,
    minScore: params.minScore ? Number(params.minScore) : undefined,
    maxScore: params.maxScore ? Number(params.maxScore) : undefined,
    missingSkill:
      typeof params.missingSkill === "string"
        ? params.missingSkill
        : undefined,
    page: Number(params.page) || 1,
  };

  const [summary, matches, branches, batches, linkedDrives, latestMatchingJob] =
    await Promise.all([
    getMatchSummary(requirementId),
    getRequirementMatches(requirementId, filters),
    getDistinctBranches(),
    getDistinctBatches(),
    getDrivesByRequirement(requirementId),
    getLatestJobForRequirement(requirementId),
  ]);

  const drivesBasePath = `${getRolePrefix(role)}/placement-drives`;
  const jobsBasePath = canUserListJobs(role)
    ? `${getRolePrefix(role)}/jobs`
    : "";

  const requirementBasePath = `${companiesBasePath}/${companyId}/requirements/${requirementId}`;

  return (
    <RequirementDetailClient
      requirement={requirement}
      summary={summary}
      matches={matches}
      branches={branches}
      batches={batches}
      basePath={requirementBasePath}
      studentsBasePath={studentsBasePath}
      companyBackPath={`${companiesBasePath}/${companyId}`}
      editPath={`${companiesBasePath}/${companyId}/requirements/${requirementId}/edit`}
      canManage={canManageRequirements(role)}
        canRunMatching={canRunMatching(role)}
        canExport={canExportMatching(role)}
      canShare={canManageSharing(role)}
      canManageDrives={canManageDrives(role)}
      drivesBasePath={drivesBasePath}
      linkedDrives={linkedDrives}
      jobsBasePath={jobsBasePath}
      latestMatchingJob={latestMatchingJob}
    />
  );
}
