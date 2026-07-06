import { PlacementDriveDetailPageContent } from "@/lib/pages/placement-drives-content";

export default async function FacultyPlacementDriveDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  return (
    <PlacementDriveDetailPageContent
      role="FACULTY"
      basePath="/faculty/placement-drives"
      id={id}
      searchParams={searchParams}
    />
  );
}
