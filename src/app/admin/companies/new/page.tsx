import { CompanyFormPageContent } from "@/lib/pages/company-form-content";

export default function AdminNewCompanyPage() {
  return (
    <CompanyFormPageContent
      role="SUPER_ADMIN"
      basePath="/admin/companies"
      mode="create"
    />
  );
}
