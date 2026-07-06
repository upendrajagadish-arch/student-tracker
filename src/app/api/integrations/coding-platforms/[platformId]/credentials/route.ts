import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canManageIntegrations } from "@/lib/permissions";
import { savePlatformCredentials } from "@/lib/services/coding-platform-integrations";

interface RouteParams {
  params: Promise<{ platformId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canManageIntegrations(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { platformId } = await params;
  const body = await request.json();

  try {
    const integration = await savePlatformCredentials(
      platformId,
      {
        apiKey: body.apiKey,
        accessToken: body.accessToken,
        teamId: body.teamId,
        clientId: body.clientId,
        clientSecret: body.clientSecret,
      },
      { actorUserId: session.id, actorRole: session.role }
    );
    return NextResponse.json(integration);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
