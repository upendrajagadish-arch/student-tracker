import { PilotChecklistClient } from "@/components/admin/PilotChecklistClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { getRolePrefix } from "@/lib/permissions";
import { getPilotChecklistStatus } from "@/lib/services/pilot-checklist";
import type { UserRole } from "@/types";

export async function PilotChecklistPageContent({ role }: { role: UserRole }) {
  const checklist = await getPilotChecklistStatus();
  const basePath = getRolePrefix(role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pilot Readiness Checklist"
        description="Verify PlacementIQ is ready for a college pilot with up to 5,000 students."
      />
      <PilotChecklistClient checklist={checklist} basePath={basePath} />
    </div>
  );
}
