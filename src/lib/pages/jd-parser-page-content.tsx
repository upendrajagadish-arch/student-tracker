import { JdParserPageClient } from "@/components/companies/JdParserPageClient";
import { canParseJobDescription } from "@/lib/permissions";
import { getCompanies } from "@/lib/services/companies";
import type { UserRole } from "@/types";
import { notFound } from "next/navigation";

export async function JdParserPageContent({
  role,
  companiesBasePath,
  companyId,
}: {
  role: UserRole;
  companiesBasePath: string;
  companyId?: string;
}) {
  if (!canParseJobDescription(role)) notFound();

  const companiesResult = await getCompanies({ pageSize: 200, isActive: true });
  const companies = companiesResult.data.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const initialCompany = companyId
    ? companies.find((c) => c.id === companyId)
    : undefined;

  if (companyId && !initialCompany) notFound();

  return (
    <JdParserPageClient
      basePath={companiesBasePath}
      companies={companies}
      initialCompanyId={initialCompany?.id}
      initialCompanyName={initialCompany?.name}
    />
  );
}
