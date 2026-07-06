import { SharedStudentsPageContent } from "@/lib/pages/shared-students-content";

export default async function AdminSharedStudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <SharedStudentsPageContent
      role="SUPER_ADMIN"
      basePath="/admin/shared-students"
      studentsBasePath="/admin/students"
      searchParams={searchParams}
    />
  );
}
