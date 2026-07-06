import { LoginPageClient } from "@/components/auth/LoginPageClient";
import { getPublicBrandingSettings } from "@/lib/services/app-settings";

export default async function LoginPage() {
  const branding = await getPublicBrandingSettings();
  return <LoginPageClient branding={branding} />;
}
