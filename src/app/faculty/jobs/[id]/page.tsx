import { JobDetailPageContent } from "@/lib/pages/job-detail-content";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FacultyJobDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <JobDetailPageContent
      role="FACULTY"
      jobId={id}
      companiesBasePath="/faculty/companies"
    />
  );
}
