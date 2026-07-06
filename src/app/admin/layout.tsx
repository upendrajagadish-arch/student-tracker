import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { requireRole } from "@/lib/auth";
import { getPublicBrandingSettings } from "@/lib/services/app-settings";
import { type ReactNode } from "react";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole(["SUPER_ADMIN"]);
  const branding = await getPublicBrandingSettings();
  return (
    <DashboardLayout user={user} branding={branding}>
      {children}
    </DashboardLayout>
  );
}
