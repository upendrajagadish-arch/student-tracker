import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getLatestReadinessSnapshot } from "@/lib/services/readiness";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "readiness:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const snapshot = await getLatestReadinessSnapshot(id);

  if (!snapshot) {
    return NextResponse.json(
      { error: "No readiness snapshot found" },
      { status: 404 }
    );
  }

  return NextResponse.json(snapshot);
}
