import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canApplyResumeInsights } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { applyInsightToResumeReview } from "@/lib/services/resume-insights";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canApplyResumeInsights(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  const { id } = await params;

  try {
    const result = await applyInsightToResumeReview(id, session.id);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "RESUME_INSIGHT_APPLIED",
      entityType: "ResumeInsight",
      entityId: result.insight.id,
      description: `Applied resume insight to review for resume ${result.resumeId}`,
    });

    return NextResponse.json({ success: true, data: result.insight });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/resume-insights/[id]/apply",
      action: "resume_insight_apply",
      fallbackMessage: "Could not apply insight to resume review.",
    });
  }
}
