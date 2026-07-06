import { NextResponse } from "next/server";
import { getPublicBrandingSettings } from "@/lib/services/app-settings";

export async function GET() {
  const branding = await getPublicBrandingSettings();
  return NextResponse.json({ success: true, data: branding });
}
