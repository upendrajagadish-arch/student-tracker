import { CodingPlatformsListPageContent } from "@/lib/pages/coding-platforms-list-content";

export default function AdminCodingPlatformsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <CodingPlatformsListPageContent
      role="SUPER_ADMIN"
      basePath="/admin/coding-platforms"
      studentsBasePath="/admin/students"
      searchParams={searchParams}
    />
  );
}
