import { TechStackListPageContent } from "@/lib/pages/tech-stack-list-content";

export default function FacultyTechStackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <TechStackListPageContent
      role="FACULTY"
      basePath="/faculty/tech-stack"
      studentsBasePath="/faculty/students"
      searchParams={searchParams}
    />
  );
}
