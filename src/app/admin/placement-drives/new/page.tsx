import { PlacementDriveFormPageContent } from "@/lib/pages/placement-drives-content";

export default function AdminNewPlacementDrivePage() {
  return (
    <PlacementDriveFormPageContent
      role="SUPER_ADMIN"
      basePath="/admin/placement-drives"
      mode="create"
    />
  );
}
