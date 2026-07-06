import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canPrintPassport, canViewPassport } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { getPassportSnapshotById } from "@/lib/services/placement-passport";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (
    !session ||
    !canViewPassport(session.role) ||
    !canPrintPassport(session.role)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: studentId } = await params;
  const url = new URL(request.url);
  const snapshotId = url.searchParams.get("snapshotId");

  if (!snapshotId) {
    return NextResponse.json({ error: "Snapshot ID required" }, { status: 400 });
  }

  const passport = await getPassportSnapshotById(snapshotId);
  if (!passport || passport.studentId !== studentId) {
    return NextResponse.json({ error: "Passport not found" }, { status: 404 });
  }

  await logAudit({
    actorUserId: session.id,
    actorRole: session.role,
    action: "PLACEMENT_PASSPORT_PRINTED",
    entityType: "PlacementPassportSnapshot",
    entityId: passport.id,
    description: `Printed placement passport for ${passport.summary.student.fullName}`,
  });

  return NextResponse.json({ ok: true });
}
