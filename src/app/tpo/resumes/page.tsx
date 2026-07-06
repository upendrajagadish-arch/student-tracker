import { ResumesListPageContent } from "@/lib/pages/resumes-list-content";

export default function TpoResumesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <ResumesListPageContent
      role="TPO_ADMIN"
      basePath="/tpo/resumes"
      studentsBasePath="/tpo/students"
      searchParams={searchParams}
    />
  );
}
