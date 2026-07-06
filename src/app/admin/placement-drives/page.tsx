import { PlacementDrivesListPageContent } from "@/lib/pages/placement-drives-content";

export default async function AdminPlacementDrivesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <PlacementDrivesListPageContent
      role="SUPER_ADMIN"
      basePath="/admin/placement-drives"
      searchParams={searchParams}
    />
  );
}
