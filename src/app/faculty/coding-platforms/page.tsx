import { CodingPlatformsListPageContent } from "@/lib/pages/coding-platforms-list-content";

export default function FacultyCodingPlatformsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <CodingPlatformsListPageContent
      role="FACULTY"
      basePath="/faculty/coding-platforms"
      studentsBasePath="/faculty/students"
      searchParams={searchParams}
    />
  );
}
