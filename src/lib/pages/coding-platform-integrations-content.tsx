import { CodingPlatformIntegrationsClient } from "@/components/integrations/CodingPlatformIntegrationsClient";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  canManageIntegrations,
  canTestIntegrations,
  canViewIntegrations,
} from "@/lib/permissions";
import { getIntegrations } from "@/lib/services/coding-platform-integrations";
import type { UserRole } from "@/types";
import { notFound } from "next/navigation";

export async function CodingPlatformIntegrationsPageContent({
  role,
}: {
  role: UserRole;
}) {
  if (!canViewIntegrations(role)) notFound();

  const integrations = await getIntegrations();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coding Platform API Integrations"
        description="Configure, test, and manage official API access for coding platforms. Credentials are stored encrypted and never returned to the browser."
      />
      <CodingPlatformIntegrationsClient
        initialIntegrations={integrations}
        canManage={canManageIntegrations(role)}
        canTest={canTestIntegrations(role)}
      />
    </div>
  );
}
