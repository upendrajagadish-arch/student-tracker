import { StudentsListPageContent } from "@/lib/pages/students-list-content";

export default function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <StudentsListPageContent
      role="SUPER_ADMIN"
      basePath="/admin/students"
      apiBasePath="/api/students"
      searchParams={searchParams}
    />
  );
}
