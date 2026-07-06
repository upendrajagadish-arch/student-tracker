import { RequirementFormPageContent } from "@/lib/pages/requirement-form-content";

export default async function AdminEditRequirementPage({
  params,
}: {
  params: Promise<{ id: string; requirementId: string }>;
}) {
  const { id, requirementId } = await params;
  return (
    <RequirementFormPageContent
      role="SUPER_ADMIN"
      companyId={id}
      requirementId={requirementId}
      companiesBasePath="/admin/companies"
      mode="edit"
    />
  );
}
