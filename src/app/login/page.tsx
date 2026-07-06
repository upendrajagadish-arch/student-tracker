import { LoginPageClient } from "@/components/auth/LoginPageClient";
import { getPublicBrandingSettings } from "@/lib/services/app-settings";

/** Avoid build-time DB access on Vercel/CI — branding loads at request time. */
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const branding = await getPublicBrandingSettings();
  return <LoginPageClient branding={branding} />;
}
