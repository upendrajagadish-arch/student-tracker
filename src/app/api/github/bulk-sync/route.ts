import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canSyncGitHub } from "@/lib/permissions";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit-middleware";
import { createJob } from "@/lib/services/jobs";
import {
  runGitHubSyncJob,
  scheduleJobExecution,
} from "@/lib/services/job-runners";
import { prisma } from "@/lib/db";
import type { GitHubSyncStatus } from "@/types/github";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !canSyncGitHub(session.role)) {
    return apiError(
      "UNAUTHORIZED",
      unauthorizedMessage(session?.role),
      401
    );
  }

  const limited = await withRateLimit(
    request,
    "github_bulk_sync",
    RATE_LIMITS.readinessBulk,
    session.id
  );
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));
    const studentIds = Array.isArray(body.studentIds)
      ? (body.studentIds as string[])
      : undefined;
    const branch = body.branch as string | undefined;
    const batch = body.batch as string | undefined;
    const syncStatus = body.syncStatus as GitHubSyncStatus | undefined;

    let targetIds = studentIds ?? [];

    if (targetIds.length === 0) {
      const where: {
        branch?: string;
        batch?: string;
        githubProfile?: { syncStatus?: GitHubSyncStatus };
      } = {};
      if (branch) where.branch = branch;
      if (batch) where.batch = batch;
      if (syncStatus) where.githubProfile = { syncStatus };

      const students = await prisma.student.findMany({
        where,
        select: { id: true },
        orderBy: { fullName: "asc" },
        take: 200,
      });
      targetIds = students.map((s) => s.id);
    }

    if (targetIds.length === 0) {
      return apiError(
        "BAD_REQUEST",
        "No students matched the selected filters.",
        400
      );
    }

    const filterLabel =
      studentIds && studentIds.length > 0
        ? `${targetIds.length} selected students`
        : [branch, batch, syncStatus].filter(Boolean).join(" · ") ||
          "filtered students";

    const job = await createJob({
      jobType: "GITHUB_SYNC",
      title: "Bulk GitHub sync",
      description: `Syncing GitHub profiles for ${filterLabel} (${targetIds.length.toLocaleString()} students)`,
      createdByUserId: session.id,
      progressTotal: targetIds.length,
      meta: { studentIds: targetIds, branch, batch },
    });

    scheduleJobExecution(() =>
      runGitHubSyncJob(job.id, {
        studentIds: targetIds,
        actorUserId: session.id,
        actorRole: session.role,
      })
    );

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      totalStudents: targetIds.length,
      message: "Bulk GitHub sync job started. Track progress on the Jobs page.",
    });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/github/bulk-sync",
      action: "github_bulk_sync",
      fallbackMessage: "Bulk GitHub sync failed. Please try again.",
    });
  }
}
