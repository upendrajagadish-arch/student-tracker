import { JobsListPageContent } from "@/lib/pages/jobs-list-content";

export default function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <JobsListPageContent role="SUPER_ADMIN" searchParams={searchParams} />
  );
}
