import { ReadinessListPageContent } from "@/lib/pages/readiness-list-content";

export default function FacultyReadinessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <ReadinessListPageContent
      role="FACULTY"
      basePath="/faculty/readiness"
      studentsBasePath="/faculty/students"
      searchParams={searchParams}
    />
  );
}
