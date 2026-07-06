import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canApplyResumeInsights } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { dismissInsight } from "@/lib/services/resume-insights";

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
    const insight = await dismissInsight(id, session.id);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "RESUME_INSIGHT_DISMISSED",
      entityType: "ResumeInsight",
      entityId: insight.id,
      description: "Dismissed resume insight",
    });

    return NextResponse.json({ success: true, data: insight });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/resume-insights/[id]/dismiss",
      action: "resume_insight_dismiss",
      fallbackMessage: "Could not dismiss insight.",
    });
  }
}
