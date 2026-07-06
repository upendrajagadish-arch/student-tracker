import { PlacementDriveFormPageContent } from "@/lib/pages/placement-drives-content";

export default async function AdminEditPlacementDrivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PlacementDriveFormPageContent
      role="SUPER_ADMIN"
      basePath="/admin/placement-drives"
      id={id}
      mode="edit"
    />
  );
}
