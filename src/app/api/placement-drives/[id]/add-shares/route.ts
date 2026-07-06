import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canManageDrives } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { addShortlistedSharesToDrive } from "@/lib/services/placement-drives";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canManageDrives(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const requirementId = body.requirementId as string;
    const shareIds = body.shareIds as string[] | undefined;

    if (!requirementId) {
      return apiError("BAD_REQUEST", "Requirement ID is required.", 400);
    }

    const result = await addShortlistedSharesToDrive(
      id,
      requirementId,
      shareIds,
      session.id
    );

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "STUDENT_ADDED_TO_DRIVE",
      entityType: "PlacementDrive",
      entityId: id,
      description: `Added ${result.added} shortlisted HR shares to drive`,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/placement-drives/[id]/add-shares",
      action: "add_shares",
    });
  }
}
