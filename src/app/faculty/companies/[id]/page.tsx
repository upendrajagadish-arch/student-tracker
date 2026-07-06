import { CompanyDetailPageContent } from "@/lib/pages/company-detail-content";

export default async function FacultyCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <CompanyDetailPageContent
      id={id}
      role="FACULTY"
      basePath="/faculty/companies"
    />
  );
}
