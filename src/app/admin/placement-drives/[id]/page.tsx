import { PlacementDriveDetailPageContent } from "@/lib/pages/placement-drives-content";

export default async function AdminPlacementDriveDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  return (
    <PlacementDriveDetailPageContent
      role="SUPER_ADMIN"
      basePath="/admin/placement-drives"
      id={id}
      searchParams={searchParams}
    />
  );
}
