import { CompanyDetailPageContent } from "@/lib/pages/company-detail-content";

export default async function TpoCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <CompanyDetailPageContent
      id={id}
      role="TPO_ADMIN"
      basePath="/tpo/companies"
    />
  );
}
