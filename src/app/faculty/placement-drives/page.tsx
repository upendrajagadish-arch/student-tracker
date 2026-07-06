import { PlacementDrivesListPageContent } from "@/lib/pages/placement-drives-content";

export default async function FacultyPlacementDrivesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <PlacementDrivesListPageContent
      role="FACULTY"
      basePath="/faculty/placement-drives"
      searchParams={searchParams}
    />
  );
}
