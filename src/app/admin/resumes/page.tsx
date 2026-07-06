import { ResumesListPageContent } from "@/lib/pages/resumes-list-content";

export default function AdminResumesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <ResumesListPageContent
      role="SUPER_ADMIN"
      basePath="/admin/resumes"
      studentsBasePath="/admin/students"
      searchParams={searchParams}
    />
  );
}
