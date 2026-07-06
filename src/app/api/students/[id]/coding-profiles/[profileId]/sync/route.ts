import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canManageCodingProfiles } from "@/lib/permissions";
import { syncStudentCodingProfileFromApi } from "@/lib/services/coding-live-sync";

interface RouteParams {
  params: Promise<{ id: string; profileId: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canManageCodingProfiles(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { profileId } = await params;

  try {
    const result = await syncStudentCodingProfileFromApi(profileId, {
      actorUserId: session.id,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sync profile";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
