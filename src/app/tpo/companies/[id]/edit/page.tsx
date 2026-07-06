import { CompanyFormPageContent } from "@/lib/pages/company-form-content";

export default async function TpoEditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <CompanyFormPageContent
      role="TPO_ADMIN"
      basePath="/tpo/companies"
      id={id}
      mode="edit"
    />
  );
}
