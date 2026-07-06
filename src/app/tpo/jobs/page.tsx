import { JobsListPageContent } from "@/lib/pages/jobs-list-content";

export default function TpoJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <JobsListPageContent role="TPO_ADMIN" searchParams={searchParams} />
  );
}
