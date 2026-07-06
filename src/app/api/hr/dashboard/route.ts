import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getHrDashboardStats } from "@/lib/services/student-sharing";

export async function GET() {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "talent:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await getHrDashboardStats(session.id);
  return NextResponse.json(stats);
}
