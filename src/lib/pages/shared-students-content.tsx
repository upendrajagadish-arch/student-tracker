import { SharedStudentsPageClient } from "@/components/sharing/SharedStudentsPageClient";
import { canManageDrives, canManageSharing, canViewSharing, getRolePrefix } from "@/lib/permissions";
import { getCompanies } from "@/lib/services/companies";
import { getDrivesByRequirement } from "@/lib/services/placement-drives";
import { getInternalSharedStudents } from "@/lib/services/student-sharing";
import type { HRDecision, ShareStatus } from "@/types/sharing";
import type { UserRole } from "@/types";
import { notFound } from "next/navigation";

export async function SharedStudentsPageContent({
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
  if (!canViewSharing(role)) notFound();

  const params = await searchParams;
  const requirementId =
    typeof params.requirementId === "string" ? params.requirementId : undefined;

  const [result, companiesResult, linkedDrives] = await Promise.all([
    getInternalSharedStudents({
      companyId: typeof params.companyId === "string" ? params.companyId : undefined,
      requirementId,
      shareStatus:
        typeof params.shareStatus === "string"
          ? (params.shareStatus as ShareStatus)
          : undefined,
      hrDecision:
        typeof params.hrDecision === "string"
          ? (params.hrDecision as HRDecision)
          : undefined,
      branch: typeof params.branch === "string" ? params.branch : undefined,
      batch: typeof params.batch === "string" ? params.batch : undefined,
      search: typeof params.search === "string" ? params.search : undefined,
      page: Number(params.page) || 1,
    }),
    getCompanies({ pageSize: 100 }),
    requirementId ? getDrivesByRequirement(requirementId) : Promise.resolve([]),
  ]);

  const drivesBasePath = `${getRolePrefix(role)}/placement-drives`;

  return (
    <SharedStudentsPageClient
      result={result}
      companies={companiesResult.data.map((c) => ({ id: c.id, name: c.name }))}
      basePath={basePath}
      studentsBasePath={studentsBasePath}
      canManage={canManageSharing(role)}
      canManageDrives={canManageDrives(role)}
      drivesBasePath={drivesBasePath}
      requirementId={requirementId}
      linkedDrives={linkedDrives}
    />
  );
}
