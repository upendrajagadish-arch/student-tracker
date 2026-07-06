import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canViewIntegrations } from "@/lib/permissions";
import { getIntegrations } from "@/lib/services/coding-platform-integrations";

export async function GET() {
  const session = await getSession();
  if (!session || !canViewIntegrations(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integrations = await getIntegrations();
  return NextResponse.json({ integrations });
}
