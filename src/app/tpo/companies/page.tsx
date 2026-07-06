import { CompaniesListPageContent } from "@/lib/pages/companies-list-content";

export default async function TpoCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <CompaniesListPageContent
      role="TPO_ADMIN"
      basePath="/tpo/companies"
      searchParams={searchParams}
    />
  );
}
