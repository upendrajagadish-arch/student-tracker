import { PlacementDriveDetailPageContent } from "@/lib/pages/placement-drives-content";

export default async function TpoPlacementDriveDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  return (
    <PlacementDriveDetailPageContent
      role="TPO_ADMIN"
      basePath="/tpo/placement-drives"
      id={id}
      searchParams={searchParams}
    />
  );
}
