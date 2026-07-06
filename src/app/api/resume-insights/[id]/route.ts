import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canViewResumeInsights } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { markInsightReviewed } from "@/lib/services/resume-insights";
import { markInsightReviewedSchema } from "@/lib/validations/resume-insights";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canViewResumeInsights(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = markInsightReviewedSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "BAD_REQUEST",
        parsed.error.errors[0]?.message ?? "Invalid request.",
        400
      );
    }

    const insight = await markInsightReviewed(
      id,
      session.id,
      parsed.data.reviewStatus ?? "REVIEWED"
    );

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "RESUME_INSIGHT_REVIEWED",
      entityType: "ResumeInsight",
      entityId: insight.id,
      description: `Marked resume insight as ${insight.reviewStatus}`,
    });

    return NextResponse.json({ success: true, data: insight });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/resume-insights/[id]",
      action: "resume_insight_review",
      fallbackMessage: "Could not update insight status.",
    });
  }
}
