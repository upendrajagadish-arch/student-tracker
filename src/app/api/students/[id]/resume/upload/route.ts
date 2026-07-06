import { NextResponse } from "next/server";
import {
  resumeUploadErrorMessage,
  unauthorizedMessage,
} from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { hasPermission } from "@/lib/permissions";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit-middleware";
import { logAudit } from "@/lib/services/audit";
import { uploadResume } from "@/lib/services/resumes";
import { triggerReadinessRecalculation } from "@/lib/services/readiness";
import { getStudentById } from "@/lib/services/students";
import { validateResumeFile } from "@/lib/validations/resume";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "resume:upload")) {
    return apiError(
      "UNAUTHORIZED",
      unauthorizedMessage(session?.role),
      401
    );
  }

  const limited = await withRateLimit(
    request,
    "resume_upload",
    RATE_LIMITS.resumeUpload,
    session.id
  );
  if (limited) return limited;

  const { id: studentId } = await params;
  const student = await getStudentById(studentId);
  if (!student) {
    return apiError("NOT_FOUND", "Student not found", 404);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return apiError(
        "BAD_REQUEST",
        "Please choose a PDF or DOCX resume file.",
        400
      );
    }

    const maxBytes = getServerEnv().MAX_UPLOAD_SIZE_MB * 1024 * 1024;
    const validation = validateResumeFile(file, maxBytes);
    if (!validation.valid) {
      return apiError("VALIDATION_ERROR", validation.error, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const resume = await uploadResume(
      studentId,
      {
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        buffer,
      },
      session.id
    );

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "RESUME_UPLOADED",
      entityType: "Resume",
      entityId: resume.id,
      description: `Uploaded resume v${resume.version} for ${student.fullName} (${student.rollNumber})`,
    });

    await triggerReadinessRecalculation(studentId);

    return NextResponse.json({ success: true, data: resume }, { status: 201 });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/students/[id]/resume/upload",
      action: "resume_upload",
      fallbackMessage: resumeUploadErrorMessage(error),
    });
  }
}
