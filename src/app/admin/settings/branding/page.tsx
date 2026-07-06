import { BrandingSettingsPageContent } from "@/lib/pages/branding-settings-content";

export default function AdminBrandingSettingsPage() {
  return (
    <BrandingSettingsPageContent
      role="SUPER_ADMIN"
      settingsBasePath="/admin/settings"
    />
  );
}
