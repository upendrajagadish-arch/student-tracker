import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canVerifyCodingProfiles } from "@/lib/permissions";
import { verifyStudentCodingProfile } from "@/lib/services/coding-platforms";
import type { CodingProfileVerificationStatus } from "@/types/coding-platforms";

interface RouteParams {
  params: Promise<{ id: string; profileId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canVerifyCodingProfiles(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { profileId } = await params;

  try {
    const body = await request.json();
    const status = body.verificationStatus as CodingProfileVerificationStatus;
    if (!status) {
      return NextResponse.json(
        { error: "verificationStatus is required" },
        { status: 400 }
      );
    }

    const profile = await verifyStudentCodingProfile(profileId, status, {
      actorUserId: session.id,
      actorRole: session.role,
    });
    return NextResponse.json(profile);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to verify profile";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
