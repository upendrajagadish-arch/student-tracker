import { CompaniesPageClient } from "@/components/companies/CompaniesPageClient";
import { canManageCompanies, canViewCompanies } from "@/lib/permissions";
import { getCompanies } from "@/lib/services/companies";
import type { UserRole } from "@/types";
import { notFound } from "next/navigation";

export async function CompaniesListPageContent({
  role,
  basePath,
  searchParams,
}: {
  role: UserRole;
  basePath: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!canViewCompanies(role)) notFound();

  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : undefined;
  const page = Number(params.page) || 1;

  const result = await getCompanies({ search, page });

  return (
    <CompaniesPageClient
      result={result}
      basePath={basePath}
      canManage={canManageCompanies(role)}
    />
  );
}
