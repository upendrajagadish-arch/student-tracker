import { RequirementFormPageContent } from "@/lib/pages/requirement-form-content";

export default async function TpoNewRequirementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <RequirementFormPageContent
      role="TPO_ADMIN"
      companyId={id}
      companiesBasePath="/tpo/companies"
      mode="create"
    />
  );
}
