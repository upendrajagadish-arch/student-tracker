import { ResumesListPageContent } from "@/lib/pages/resumes-list-content";

export default function FacultyResumesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <ResumesListPageContent
      role="FACULTY"
      basePath="/faculty/resumes"
      studentsBasePath="/faculty/students"
      searchParams={searchParams}
    />
  );
}
