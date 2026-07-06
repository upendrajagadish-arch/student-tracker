import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  canManageCodingProfiles,
  canVerifyCodingProfiles,
} from "@/lib/permissions";
import {
  deleteStudentCodingProfile,
  updateStudentCodingProfile,
  verifyStudentCodingProfile,
} from "@/lib/services/coding-platforms";
import type { CodingProfileVerificationStatus } from "@/types/coding-platforms";

interface RouteParams {
  params: Promise<{ id: string; profileId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canManageCodingProfiles(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { profileId } = await params;

  try {
    const body = await request.json();
    const profile = await updateStudentCodingProfile(
      profileId,
      {
        platformId: body.platformId,
        username: body.username,
        profileUrl: body.profileUrl,
        totalProblemsSolved: body.totalProblemsSolved,
        easySolved: body.easySolved,
        mediumSolved: body.mediumSolved,
        hardSolved: body.hardSolved,
        contestRating: body.contestRating,
        globalRank: body.globalRank,
        badges: body.badges,
        primaryLanguages: body.primaryLanguages,
        lastActivityAt: body.lastActivityAt,
        verificationStatus: body.verificationStatus,
        notes: body.notes,
      },
      { actorUserId: session.id, actorRole: session.role }
    );
    return NextResponse.json(profile);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canManageCodingProfiles(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { profileId } = await params;

  try {
    await deleteStudentCodingProfile(profileId, {
      actorUserId: session.id,
      actorRole: session.role,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete profile";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
