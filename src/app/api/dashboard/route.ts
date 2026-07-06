import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  getDashboardStats,
  getDistinctBatches,
  getDistinctBranches,
} from "@/lib/services/students";

export async function GET() {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "dashboard:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [stats, branches, batches] = await Promise.all([
    getDashboardStats(),
    getDistinctBranches(),
    getDistinctBatches(),
  ]);

  return NextResponse.json({ stats, branches, batches });
}
