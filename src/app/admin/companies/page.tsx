import { CompaniesListPageContent } from "@/lib/pages/companies-list-content";

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <CompaniesListPageContent
      role="SUPER_ADMIN"
      basePath="/admin/companies"
      searchParams={searchParams}
    />
  );
}
