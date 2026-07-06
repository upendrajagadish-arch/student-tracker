import { JobDetailPageContent } from "@/lib/pages/job-detail-content";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminJobDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <JobDetailPageContent
      role="SUPER_ADMIN"
      jobId={id}
      companiesBasePath="/admin/companies"
    />
  );
}
