import { RequirementDetailPageContent } from "@/lib/pages/requirement-detail-content";

export default async function AdminRequirementDetailPage({
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
      role="SUPER_ADMIN"
      companiesBasePath="/admin/companies"
      studentsBasePath="/admin/students"
      searchParams={searchParams}
    />
  );
}
