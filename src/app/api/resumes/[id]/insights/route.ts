import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canViewResumeInsights } from "@/lib/permissions";
import { getResumeById } from "@/lib/services/resumes";
import { getResumeInsights } from "@/lib/services/resume-insights";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canViewResumeInsights(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  const { id } = await params;
  const resume = await getResumeById(id);
  if (!resume) {
    return apiError("NOT_FOUND", "Resume not found.", 404);
  }

  const insight = await getResumeInsights(id);
  return NextResponse.json({ success: true, data: insight });
}
