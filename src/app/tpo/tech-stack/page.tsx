import { TechStackListPageContent } from "@/lib/pages/tech-stack-list-content";

export default function TpoTechStackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <TechStackListPageContent
      role="TPO_ADMIN"
      basePath="/tpo/tech-stack"
      studentsBasePath="/tpo/students"
      searchParams={searchParams}
    />
  );
}
