import { SkillEvidencePageClientShell } from "@/components/skill-evidence/SkillEvidencePageClient";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  canRefreshSkillEvidence,
  canViewSkillEvidence,
  getRolePrefix,
} from "@/lib/permissions";
import { getSkillEvidenceOverview } from "@/lib/services/skill-evidence";
import {
  getDistinctBatches,
  getDistinctBranches,
} from "@/lib/services/students";
import type { EvidenceStrength } from "@/types/skill-evidence";
import type { UserRole } from "@/types";
import { notFound } from "next/navigation";

export async function SkillEvidenceListPageContent({
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
  if (!canViewSkillEvidence(role)) notFound();

  const params = await searchParams;
  const filters = {
    search: typeof params.search === "string" ? params.search : undefined,
    branch: typeof params.branch === "string" ? params.branch : undefined,
    batch: typeof params.batch === "string" ? params.batch : undefined,
    evidenceStrength:
      typeof params.evidenceStrength === "string"
        ? (params.evidenceStrength as EvidenceStrength)
        : undefined,
    page: Number(params.page) || 1,
  };

  const [result, branches, batches] = await Promise.all([
    getSkillEvidenceOverview(filters),
    getDistinctBranches(),
    getDistinctBatches(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skill Evidence"
        description="Unified skill evidence across tech stack, resume, GitHub, coding platforms, and company requirements."
      />
      <SkillEvidencePageClientShell
        result={result}
        branches={branches}
        batches={batches}
        basePath={basePath}
        jobsBasePath={`${getRolePrefix(role)}/jobs`}
        studentsBasePath={studentsBasePath}
        canRefresh={canRefreshSkillEvidence(role)}
      />
    </div>
  );
}
