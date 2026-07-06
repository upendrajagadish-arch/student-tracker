import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canUserViewJob, getJob } from "@/lib/services/jobs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(undefined), 401);
  }

  const { id } = await params;
  const job = await getJob(id);
  if (!job) {
    return apiError("NOT_FOUND", "Job not found.", 404);
  }

  if (!canUserViewJob({ userId: session.id, role: session.role }, job)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session.role), 403);
  }

  return NextResponse.json({ success: true, data: job });
}
