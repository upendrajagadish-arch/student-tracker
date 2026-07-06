import { TechStackListPageContent } from "@/lib/pages/tech-stack-list-content";

export default function AdminTechStackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <TechStackListPageContent
      role="SUPER_ADMIN"
      basePath="/admin/tech-stack"
      studentsBasePath="/admin/students"
      searchParams={searchParams}
    />
  );
}
