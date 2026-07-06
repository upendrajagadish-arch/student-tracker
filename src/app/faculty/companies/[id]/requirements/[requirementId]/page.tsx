import { RequirementDetailPageContent } from "@/lib/pages/requirement-detail-content";

export default async function FacultyRequirementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; requirementId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id, requirementId } = await params;
  return (
    <RequirementDetailPageContent
      companyId={id}
      requirementId={requirementId}
      role="FACULTY"
      companiesBasePath="/faculty/companies"
      studentsBasePath="/faculty/students"
      searchParams={searchParams}
    />
  );
}
