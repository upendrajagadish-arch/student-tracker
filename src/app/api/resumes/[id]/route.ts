import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import {
  deactivateResume,
  getResumeById,
  reviewResume,
} from "@/lib/services/resumes";
import { triggerReadinessRecalculation } from "@/lib/services/readiness";
import { resumeReviewSchema } from "@/lib/validations/resume";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "resume:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const resume = await getResumeById(id);
  if (!resume) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  return NextResponse.json(resume);
}

export async function PUT(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "resume:review")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = resumeReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const existing = await getResumeById(id);
    if (!existing) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const resume = await reviewResume(id, parsed.data, session.id);

    const statusChanged = existing.reviewStatus !== resume.reviewStatus;

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: statusChanged ? "RESUME_STATUS_UPDATED" : "RESUME_REVIEWED",
      entityType: "Resume",
      entityId: resume.id,
      description: `Reviewed resume for student (${existing.originalFileName}) — status: ${resume.reviewStatus}, score: ${resume.resumeScore}`,
    });

    await triggerReadinessRecalculation(resume.studentId);

    return NextResponse.json(resume);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Review failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "resume:delete")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getResumeById(id);
  if (!existing) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  await deactivateResume(id);

  await logAudit({
    actorUserId: session.id,
    actorRole: session.role,
    action: "RESUME_DEACTIVATED",
    entityType: "Resume",
    entityId: id,
    description: `Deactivated resume ${existing.originalFileName}`,
  });

  await triggerReadinessRecalculation(existing.studentId);

  return NextResponse.json({ success: true });
}
