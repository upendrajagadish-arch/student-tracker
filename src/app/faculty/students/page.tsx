import { StudentsListPageContent } from "@/lib/pages/students-list-content";

export default function FacultyStudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <StudentsListPageContent
      role="FACULTY"
      basePath="/faculty/students"
      apiBasePath="/api/students"
      searchParams={searchParams}
    />
  );
}
