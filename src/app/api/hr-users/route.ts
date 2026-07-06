import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getHrUsers } from "@/lib/services/hr-access";

export async function GET() {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "hr_access:manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await getHrUsers();
  return NextResponse.json(users);
}
