import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canRefreshSkillEvidence } from "@/lib/permissions";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit-middleware";
import { logAudit } from "@/lib/services/audit";
import { createJob } from "@/lib/services/jobs";
import {
  runSkillEvidenceRefreshJob,
  scheduleJobExecution,
} from "@/lib/services/job-runners";
import { resolveStudentIdsForBulkRefresh } from "@/lib/services/skill-evidence";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !canRefreshSkillEvidence(session.role)) {
    return apiError(
      "UNAUTHORIZED",
      unauthorizedMessage(session?.role),
      401
    );
  }

  const limited = await withRateLimit(
    request,
    "skill_evidence_bulk_refresh",
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

    const targetIds = await resolveStudentIdsForBulkRefresh({
      studentIds,
      branch,
      batch,
    });

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
        : [branch, batch].filter(Boolean).join(" · ") || "all students";

    const job = await createJob({
      jobType: "SKILL_EVIDENCE_REFRESH",
      title: "Bulk skill evidence refresh",
      description: `Refreshing skill evidence for ${filterLabel} (${targetIds.length.toLocaleString()} students)`,
      createdByUserId: session.id,
      meta: { studentIds: targetIds, branch, batch },
    });

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "SKILL_EVIDENCE_BULK_REFRESH_STARTED",
      entityType: "Job",
      entityId: job.id,
      description: `Bulk skill evidence refresh started for ${targetIds.length} students`,
    });

    scheduleJobExecution(() =>
      runSkillEvidenceRefreshJob(job.id, {
        studentIds: targetIds,
        actorUserId: session.id,
        actorRole: session.role,
      })
    );

    return NextResponse.json({ jobId: job.id, studentCount: targetIds.length });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Bulk refresh failed";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
