import { TechStackPageClient } from "@/components/tech-stack/TechStackPageClient";
import {
  canManageSkillMaster,
  canViewTechStack,
} from "@/lib/permissions";
import {
  getActiveTechSkills,
  getAllTechSkills,
  getTechStackOverview,
} from "@/lib/services/tech-stack";
import {
  getDistinctBatches,
  getDistinctBranches,
} from "@/lib/services/students";
import type {
  ProficiencyLevel,
  SkillCategory,
  TechStackFilters,
  VerificationStatus,
} from "@/types/tech-stack";
import type { UserRole } from "@/types";
import { notFound } from "next/navigation";

export async function TechStackListPageContent({
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
  if (!canViewTechStack(role)) notFound();

  const params = await searchParams;
  const filters: TechStackFilters = {
    search: typeof params.search === "string" ? params.search : undefined,
    branch: typeof params.branch === "string" ? params.branch : undefined,
    batch: typeof params.batch === "string" ? params.batch : undefined,
    techSkillId:
      typeof params.techSkillId === "string" ? params.techSkillId : undefined,
    category:
      typeof params.category === "string"
        ? (params.category as SkillCategory)
        : undefined,
    proficiencyLevel:
      typeof params.proficiencyLevel === "string"
        ? (params.proficiencyLevel as ProficiencyLevel)
        : undefined,
    verificationStatus:
      typeof params.verificationStatus === "string"
        ? (params.verificationStatus as VerificationStatus)
        : undefined,
    roleInterest:
      typeof params.roleInterest === "string" ? params.roleInterest : undefined,
    page: Number(params.page) || 1,
  };

  const [result, branches, batches, masterSkills, allMasterSkills] =
    await Promise.all([
      getTechStackOverview(filters),
      getDistinctBranches(),
      getDistinctBatches(),
      getActiveTechSkills(),
      canManageSkillMaster(role) ? getAllTechSkills() : Promise.resolve([]),
    ]);

  return (
    <TechStackPageClient
      result={result}
      branches={branches}
      batches={batches}
      masterSkills={masterSkills}
      allMasterSkills={allMasterSkills}
      basePath={basePath}
      studentsBasePath={studentsBasePath}
      canManageMaster={canManageSkillMaster(role)}
    />
  );
}
