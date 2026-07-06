import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canViewCodingPlatforms } from "@/lib/permissions";
import { getActiveCodingPlatforms } from "@/lib/services/coding-platforms";

export async function GET() {
  const session = await getSession();
  if (!session || !canViewCodingPlatforms(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const platforms = await getActiveCodingPlatforms();
  return NextResponse.json({ platforms });
}
