import { PlacementDrivesListPageContent } from "@/lib/pages/placement-drives-content";

export default async function TpoPlacementDrivesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <PlacementDrivesListPageContent
      role="TPO_ADMIN"
      basePath="/tpo/placement-drives"
      searchParams={searchParams}
    />
  );
}
