import { ReadinessListPageContent } from "@/lib/pages/readiness-list-content";

export default function AdminReadinessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <ReadinessListPageContent
      role="SUPER_ADMIN"
      basePath="/admin/readiness"
      studentsBasePath="/admin/students"
      searchParams={searchParams}
    />
  );
}
