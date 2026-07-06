import { NextResponse } from "next/server";
import { matchingErrorMessage, unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit-middleware";
import { getRequirementById } from "@/lib/services/companies";
import { getMatchSummary } from "@/lib/services/company-matching";
import { createJob } from "@/lib/services/jobs";
import {
  runCompanyMatchingJob,
  scheduleJobExecution,
} from "@/lib/services/job-runners";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "matching:run")) {
    return apiError(
      "UNAUTHORIZED",
      unauthorizedMessage(session?.role),
      401
    );
  }

  const limited = await withRateLimit(
    request,
    "matching",
    RATE_LIMITS.matching,
    session.id
  );
  if (limited) return limited;

  const { id } = await params;
  const requirement = await getRequirementById(id);
  if (!requirement) {
    return apiError("NOT_FOUND", "Company requirement not found.", 404);
  }

  try {
    const studentCount = await prisma.student.count();

    const job = await createJob({
      jobType: "COMPANY_MATCHING",
      title: `Matching: ${requirement.roleTitle}`,
      description: `Running company matching for ${requirement.roleTitle} at ${requirement.companyName}`,
      createdByUserId: session.id,
      progressTotal: studentCount,
      meta: {
        requirementId: id,
        companyId: requirement.companyId,
      },
    });

    scheduleJobExecution(() =>
      runCompanyMatchingJob(job.id, id, {
        actorUserId: session.id,
        actorRole: session.role,
      })
    );

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      message: "Matching job started. Track progress below or on the Jobs page.",
    });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/company-requirements/[id]/match",
      action: "matching_run",
      fallbackMessage: matchingErrorMessage(error),
    });
  }
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "requirements:view")) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  const { id } = await params;
  const summary = await getMatchSummary(id);
  return NextResponse.json({ success: true, data: summary });
}
