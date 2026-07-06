import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  canManageIntegrations,
  canTestIntegrations,
} from "@/lib/permissions";
import { markAccessRequestStatus } from "@/lib/services/coding-platform-integrations";
import type { AccessRequestStatus } from "@/types/coding-platform-integrations";

interface RouteParams {
  params: Promise<{ platformId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (
    !session ||
    (!canManageIntegrations(session.role) && !canTestIntegrations(session.role))
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { platformId } = await params;
  const body = await request.json();

  if (!body.accessRequestStatus) {
    return NextResponse.json(
      { error: "accessRequestStatus is required" },
      { status: 400 }
    );
  }

  try {
    const integration = await markAccessRequestStatus(
      platformId,
      {
        accessRequestStatus: body.accessRequestStatus as AccessRequestStatus,
        accessRequestNotes: body.accessRequestNotes,
        contactPerson: body.contactPerson,
        vendorContactEmail: body.vendorContactEmail,
      },
      { actorUserId: session.id, actorRole: session.role }
    );
    return NextResponse.json(integration);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
