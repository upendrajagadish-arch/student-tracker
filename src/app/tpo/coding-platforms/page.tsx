import { CodingPlatformsListPageContent } from "@/lib/pages/coding-platforms-list-content";

export default function TpoCodingPlatformsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <CodingPlatformsListPageContent
      role="TPO_ADMIN"
      basePath="/tpo/coding-platforms"
      studentsBasePath="/tpo/students"
      searchParams={searchParams}
    />
  );
}
