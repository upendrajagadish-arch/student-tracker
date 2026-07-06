import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit-middleware";
import { createJob } from "@/lib/services/jobs";
import {
  runBulkReadinessJob,
  scheduleJobExecution,
} from "@/lib/services/job-runners";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "readiness:recalculate")) {
    return apiError(
      "UNAUTHORIZED",
      unauthorizedMessage(session?.role),
      401
    );
  }

  const limited = await withRateLimit(
    request,
    "readiness_bulk",
    RATE_LIMITS.readinessBulk,
    session.id
  );
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));
    const branch = body.branch as string | undefined;
    const batch = body.batch as string | undefined;

    const where: { branch?: string; batch?: string } = {};
    if (branch) where.branch = branch;
    if (batch) where.batch = batch;

    const totalStudents = await prisma.student.count({ where });
    if (totalStudents === 0) {
      return apiError(
        "BAD_REQUEST",
        "No students matched the selected filters.",
        400
      );
    }

    const filterLabel = [branch, batch].filter(Boolean).join(" · ") || "all students";
    const job = await createJob({
      jobType: "BULK_READINESS_RECALC",
      title: `Bulk readiness recalculation`,
      description: `Recalculating readiness for ${filterLabel} (${totalStudents.toLocaleString()} students)`,
      createdByUserId: session.id,
      progressTotal: totalStudents,
      meta: { branch, batch },
    });

    scheduleJobExecution(() =>
      runBulkReadinessJob(job.id, {
        branch,
        batch,
        actorUserId: session.id,
        actorRole: session.role,
      })
    );

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      message: "Bulk readiness job started. Track progress on the Jobs page.",
    });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/readiness/recalculate",
      action: "readiness_bulk",
      fallbackMessage: "Bulk recalculation failed. Please try again.",
    });
  }
}
