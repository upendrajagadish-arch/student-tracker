import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { getHrPassportAccess } from "@/lib/services/placement-passport";

interface RouteParams {
  params: Promise<{ shareId: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "talent:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { shareId } = await params;
  const access = await getHrPassportAccess(session.id, shareId);

  if (!access.allowed) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  await logAudit({
    actorUserId: session.id,
    actorRole: session.role,
    action: "PLACEMENT_PASSPORT_PRINTED",
    entityType: "PlacementPassportSnapshot",
    entityId: access.passport.id,
    description: `HR printed placement passport for ${access.passport.summary.student.fullName}`,
  });

  return NextResponse.json({ ok: true });
}
