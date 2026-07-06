import { JobDetailPageContent } from "@/lib/pages/job-detail-content";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TpoJobDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <JobDetailPageContent
      role="TPO_ADMIN"
      jobId={id}
      companiesBasePath="/tpo/companies"
    />
  );
}
