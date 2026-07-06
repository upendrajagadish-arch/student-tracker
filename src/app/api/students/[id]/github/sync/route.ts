import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canSyncGitHub } from "@/lib/permissions";
import { syncStudentGitHubProfile } from "@/lib/services/github";
import { getStudentById } from "@/lib/services/students";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canSyncGitHub(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const student = await getStudentById(id);
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const result = await syncStudentGitHubProfile(id, {
    actorUserId: session.id,
    actorRole: session.role,
  });

  return NextResponse.json(result, {
    status: result.success ? 200 : result.syncStatus === "RATE_LIMITED" ? 429 : 400,
  });
}
