import { BrandingSettingsPageContent } from "@/lib/pages/branding-settings-content";

export default function TpoBrandingSettingsPage() {
  return (
    <BrandingSettingsPageContent
      role="TPO_ADMIN"
      settingsBasePath="/tpo/settings"
    />
  );
}
