import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  canManageCodingProfiles,
  canViewCodingPlatforms,
} from "@/lib/permissions";
import {
  createStudentCodingProfile,
  getStudentCodingProfiles,
} from "@/lib/services/coding-platforms";
import { getStudentById } from "@/lib/services/students";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canViewCodingPlatforms(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const student = await getStudentById(id);
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const profiles = await getStudentCodingProfiles(id);
  return NextResponse.json({ studentId: id, profiles });
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canManageCodingProfiles(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const student = await getStudentById(id);
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const profile = await createStudentCodingProfile(
      id,
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
    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create profile";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
