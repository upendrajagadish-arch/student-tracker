import { JobsListPageContent } from "@/lib/pages/jobs-list-content";

export default function FacultyJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <JobsListPageContent role="FACULTY" searchParams={searchParams} />
  );
}
