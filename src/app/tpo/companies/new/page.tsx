import { CompanyFormPageContent } from "@/lib/pages/company-form-content";

export default function TpoNewCompanyPage() {
  return (
    <CompanyFormPageContent
      role="TPO_ADMIN"
      basePath="/tpo/companies"
      mode="create"
    />
  );
}
