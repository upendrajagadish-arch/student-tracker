import { CompanyFormPageContent } from "@/lib/pages/company-form-content";

export default async function AdminEditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <CompanyFormPageContent
      role="SUPER_ADMIN"
      basePath="/admin/companies"
      id={id}
      mode="edit"
    />
  );
}
