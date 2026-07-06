import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  canManageIntegrations,
  canViewIntegrations,
} from "@/lib/permissions";
import {
  getIntegration,
  updateIntegrationSettings,
} from "@/lib/services/coding-platform-integrations";

interface RouteParams {
  params: Promise<{ platformId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canViewIntegrations(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { platformId } = await params;
  const integration = await getIntegration(platformId);
  if (!integration) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(integration);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canManageIntegrations(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { platformId } = await params;
  const body = await request.json();

  try {
    const integration = await updateIntegrationSettings(
      platformId,
      {
        enabled: body.enabled,
        baseUrl: body.baseUrl,
        contactPerson: body.contactPerson,
        vendorContactEmail: body.vendorContactEmail,
        documentationUrl: body.documentationUrl,
        accessRequestNotes: body.accessRequestNotes,
      },
      { actorUserId: session.id, actorRole: session.role }
    );
    return NextResponse.json(integration);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
