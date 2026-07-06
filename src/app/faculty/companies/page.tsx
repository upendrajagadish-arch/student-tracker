import { CompaniesListPageContent } from "@/lib/pages/companies-list-content";

export default async function FacultyCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <CompaniesListPageContent
      role="FACULTY"
      basePath="/faculty/companies"
      searchParams={searchParams}
    />
  );
}
