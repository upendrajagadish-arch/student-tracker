import { CompanyDetailPageContent } from "@/lib/pages/company-detail-content";

export default async function AdminCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <CompanyDetailPageContent
      id={id}
      role="SUPER_ADMIN"
      basePath="/admin/companies"
    />
  );
}
