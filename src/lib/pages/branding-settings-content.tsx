import { BrandingSettingsClient } from "@/components/admin/BrandingSettingsClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { canManageBranding, canViewBranding } from "@/lib/permissions";
import {
  getAppSettings,
  toPublicBranding,
} from "@/lib/services/app-settings";
import type { UserRole } from "@/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function BrandingSettingsPageContent({
  role,
  settingsBasePath,
}: {
  role: UserRole;
  settingsBasePath: string;
}) {
  if (!canViewBranding(role)) notFound();

  const settings = await getAppSettings();
  const branding = toPublicBranding(settings);
  const canEdit = canManageBranding(role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institution Branding"
        description={
          canEdit
            ? "Configure how your college appears on dashboards, passports, and management reports."
            : "View institution branding used across PlacementIQ."
        }
        actions={
          <Link href={settingsBasePath}>
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Settings
            </Button>
          </Link>
        }
      />
      <BrandingSettingsClient
        initialSettings={settings}
        initialBranding={branding}
        canEdit={canEdit}
        backHref={settingsBasePath}
      />
    </div>
  );
}
