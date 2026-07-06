import { NextResponse } from "next/server";
import { getInstitutionLogoBuffer } from "@/lib/services/branding-logo";

export async function GET() {
  const logo = await getInstitutionLogoBuffer();
  if (!logo) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(logo.buffer), {
    headers: {
      "Content-Type": logo.mimeType,
      "Cache-Control": "public, max-age=300",
    },
  });
}
