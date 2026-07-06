import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canSyncGitHub, canViewGitHub } from "@/lib/permissions";
import {
  getGitHubProfileForStudent,
  syncStudentGitHubProfile,
  updateStudentGitHubUsername,
} from "@/lib/services/github";
import { getStudentById } from "@/lib/services/students";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canViewGitHub(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const student = await getStudentById(id);
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const profile = await getGitHubProfileForStudent(id);
  return NextResponse.json({
    studentId: id,
    githubUrl: student.githubUrl,
    profile,
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canSyncGitHub(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const student = await getStudentById(id);
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const usernameOrUrl = String(body.usernameOrUrl ?? body.githubUrl ?? "").trim();
    if (!usernameOrUrl) {
      return NextResponse.json(
        { error: "GitHub username or profile URL is required" },
        { status: 400 }
      );
    }

    const result = await updateStudentGitHubUsername(id, usernameOrUrl, {
      actorUserId: session.id,
      actorRole: session.role,
    });

    const profile = await getGitHubProfileForStudent(id);
    return NextResponse.json({ ...result, profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update GitHub username";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
