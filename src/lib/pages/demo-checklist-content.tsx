import { DemoChecklistClient } from "@/components/admin/DemoChecklistClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { getDemoChecklistStatus } from "@/lib/services/demo-checklist";
import { getRolePrefix } from "@/lib/permissions";
import type { UserRole } from "@/types";

export async function DemoChecklistPageContent({ role }: { role: UserRole }) {
  const checklist = await getDemoChecklistStatus();
  const basePath = getRolePrefix(role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demo Checklist"
        description="Internal readiness guide for client demonstrations. Not visible to HR or students."
      />
      <DemoChecklistClient checklist={checklist} basePath={basePath} />
    </div>
  );
}
