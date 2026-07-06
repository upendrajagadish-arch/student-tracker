import { StudentsListPageContent } from "@/lib/pages/students-list-content";

export default function TpoStudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <StudentsListPageContent
      role="TPO_ADMIN"
      basePath="/tpo/students"
      apiBasePath="/api/students"
      searchParams={searchParams}
    />
  );
}
