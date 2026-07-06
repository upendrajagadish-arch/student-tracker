import { PlacementDriveFormPageContent } from "@/lib/pages/placement-drives-content";

export default function TpoNewPlacementDrivePage() {
  return (
    <PlacementDriveFormPageContent
      role="TPO_ADMIN"
      basePath="/tpo/placement-drives"
      mode="create"
    />
  );
}
