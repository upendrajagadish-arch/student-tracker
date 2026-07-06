import { SharedStudentsPageContent } from "@/lib/pages/shared-students-content";

export default async function TpoSharedStudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <SharedStudentsPageContent
      role="TPO_ADMIN"
      basePath="/tpo/shared-students"
      studentsBasePath="/tpo/students"
      searchParams={searchParams}
    />
  );
}
