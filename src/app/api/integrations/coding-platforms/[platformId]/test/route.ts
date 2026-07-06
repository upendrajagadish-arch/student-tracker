import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canTestIntegrations } from "@/lib/permissions";
import { testPlatformConnection } from "@/lib/services/coding-platform-integrations";

interface RouteParams {
  params: Promise<{ platformId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canTestIntegrations(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { platformId } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const result = await testPlatformConnection(
      platformId,
      {
        testHandle: body.testHandle,
        testId: body.testId,
        candidateEmail: body.candidateEmail,
      },
      { actorUserId: session.id, actorRole: session.role }
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Test failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
