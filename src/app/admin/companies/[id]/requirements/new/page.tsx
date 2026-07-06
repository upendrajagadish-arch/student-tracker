import { RequirementFormPageContent } from "@/lib/pages/requirement-form-content";

export default async function AdminNewRequirementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <RequirementFormPageContent
      role="SUPER_ADMIN"
      companyId={id}
      companiesBasePath="/admin/companies"
      mode="create"
    />
  );
}
