import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getAuditLogs } from "@/lib/services/audit";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "audit:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 25;

  const result = await getAuditLogs({ page, pageSize });
  return NextResponse.json(result);
}
