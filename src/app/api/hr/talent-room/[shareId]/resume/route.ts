import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { getResumeFileBuffer } from "@/lib/services/resumes";
import { canHrDownloadResume } from "@/lib/services/student-sharing";

interface RouteParams {
  params: Promise<{ shareId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "resume:download_shared")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { shareId } = await params;
  const { allowed, resumeId } = await canHrDownloadResume(session.id, shareId);

  if (!allowed || !resumeId) {
    return NextResponse.json(
      { error: "Resume download not permitted" },
      { status: 403 }
    );
  }

  try {
    const { buffer, resume } = await getResumeFileBuffer(resumeId);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "HR_RESUME_DOWNLOADED",
      entityType: "SharedStudentProfile",
      entityId: shareId,
      description: `HR downloaded resume ${resume.originalFileName}`,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": resume.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(resume.originalFileName)}"`,
        "Content-Length": String(resume.fileSize),
      },
    });
  } catch {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }
}
