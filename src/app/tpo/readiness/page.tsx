import { ReadinessListPageContent } from "@/lib/pages/readiness-list-content";

export default function TpoReadinessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <ReadinessListPageContent
      role="TPO_ADMIN"
      basePath="/tpo/readiness"
      studentsBasePath="/tpo/students"
      searchParams={searchParams}
    />
  );
}
