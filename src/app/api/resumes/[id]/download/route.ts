import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { getResumeFileBuffer } from "@/lib/services/resumes";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "resume:download")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { buffer, resume } = await getResumeFileBuffer(id);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "RESUME_DOWNLOADED",
      entityType: "Resume",
      entityId: resume.id,
      description: `Downloaded resume ${resume.originalFileName}`,
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
