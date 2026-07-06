import { CompanyDetailClient } from "@/components/companies/CompanyDetailClient";
import { canManageCompanies, canManageHrAccess, canViewCompanies } from "@/lib/permissions";
import { getCompanyById } from "@/lib/services/companies";
import type { UserRole } from "@/types";
import { notFound } from "next/navigation";

export async function CompanyDetailPageContent({
  id,
  role,
  basePath,
}: {
  id: string;
  role: UserRole;
  basePath: string;
}) {
  if (!canViewCompanies(role)) notFound();

  const company = await getCompanyById(id);
  if (!company) notFound();

  return (
    <CompanyDetailClient
      company={company}
      basePath={basePath}
      canManage={canManageCompanies(role)}
      canManageHrAccess={canManageHrAccess(role)}
    />
  );
}
