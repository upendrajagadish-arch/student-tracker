import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import {
  canUserListJobs,
  listJobs,
} from "@/lib/services/jobs";
import type { JobStatus, JobType } from "@/types/jobs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !canUserListJobs(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") as JobStatus | null;
  const jobType = url.searchParams.get("jobType") as JobType | null;
  const search = url.searchParams.get("search") ?? undefined;
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const page = Number(url.searchParams.get("page")) || 1;

  const result = await listJobs(
    {
      status: status ?? undefined,
      jobType: jobType ?? undefined,
      search,
      from,
      to,
      page,
    },
    { userId: session.id, role: session.role }
  );

  return NextResponse.json({ success: true, ...result });
}
