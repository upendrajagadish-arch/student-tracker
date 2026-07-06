import { RequirementFormPageContent } from "@/lib/pages/requirement-form-content";

export default async function TpoEditRequirementPage({
  params,
}: {
  params: Promise<{ id: string; requirementId: string }>;
}) {
  const { id, requirementId } = await params;
  return (
    <RequirementFormPageContent
      role="TPO_ADMIN"
      companyId={id}
      requirementId={requirementId}
      companiesBasePath="/tpo/companies"
      mode="edit"
    />
  );
}
