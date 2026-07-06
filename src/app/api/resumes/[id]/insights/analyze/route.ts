import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canAnalyzeResumeInsights } from "@/lib/permissions";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit-middleware";
import { logAudit } from "@/lib/services/audit";
import { getResumeById } from "@/lib/services/resumes";
import { analyzeResume } from "@/lib/services/resume-insights";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canAnalyzeResumeInsights(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  const limited = await withRateLimit(
    request,
    "resume_insight",
    RATE_LIMITS.resumeInsight,
    session.id
  );
  if (limited) return limited;

  const { id } = await params;
  const resume = await getResumeById(id);
  if (!resume) {
    return apiError("NOT_FOUND", "Resume not found.", 404);
  }

  try {
    const insight = await analyzeResume(id);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "RESUME_INSIGHT_GENERATED",
      entityType: "ResumeInsight",
      entityId: insight.id,
      description: `Generated ${insight.provider} resume insight (confidence ${Math.round(insight.confidenceScore * 100)}%)`,
    });

    return NextResponse.json({ success: true, data: insight });
  } catch (error) {
    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "RESUME_INSIGHT_FAILED",
      entityType: "Resume",
      entityId: id,
      description: "Resume insight generation failed",
    }).catch(() => undefined);

    return apiErrorFromUnknown(error, {
      route: "/api/resumes/[id]/insights/analyze",
      action: "resume_insight_analyze",
      fallbackMessage:
        "Could not analyze this resume. Try again or continue with manual review.",
    });
  }
}
