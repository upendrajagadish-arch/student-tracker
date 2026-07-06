import { PlacementDriveFormPageContent } from "@/lib/pages/placement-drives-content";

export default async function TpoEditPlacementDrivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PlacementDriveFormPageContent
      role="TPO_ADMIN"
      basePath="/tpo/placement-drives"
      id={id}
      mode="edit"
    />
  );
}
