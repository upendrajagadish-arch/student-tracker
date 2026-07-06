import { RequirementDetailPageContent } from "@/lib/pages/requirement-detail-content";

export default async function TpoRequirementDetailPage({
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
      role="TPO_ADMIN"
      companiesBasePath="/tpo/companies"
      studentsBasePath="/tpo/students"
      searchParams={searchParams}
    />
  );
}
