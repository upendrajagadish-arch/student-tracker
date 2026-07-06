import { logger } from "@/lib/logger";
import {
  completeJob,
  failJob,
  startJob,
  updateJobProgress,
} from "@/lib/services/jobs";
import type { UserRole } from "@/types";
import type { ImportRow } from "@/types/import";

/**
 * Request-driven job execution (no Redis/BullMQ yet).
 * Jobs run in the same Node process after the HTTP response is sent.
 * Requires a persistent server (`next start` / Docker) — not serverless-safe.
 */
export function scheduleJobExecution(task: () => Promise<void>): void {
  void task().catch((error) => {
    logger.error("Unhandled job execution error", { action: "job_runner" }, error);
  });
}

export async function runBulkReadinessJob(
  jobId: string,
  options: {
    branch?: string;
    batch?: string;
    actorUserId: string;
    actorRole: UserRole;
  }
): Promise<void> {
  const started = Date.now();
  try {
    await startJob(jobId);
    const { recalculateBulkReadinessWithProgress } = await import(
      "@/lib/services/readiness"
    );

    const result = await recalculateBulkReadinessWithProgress({
      branch: options.branch,
      batch: options.batch,
      actorUserId: options.actorUserId,
      actorRole: options.actorRole,
      onProgress: async (current, total) => {
        await updateJobProgress(jobId, current, total);
      },
    });

    await completeJob(jobId, {
      totalStudents: result.totalStudents,
      recalculatedCount: result.recalculatedCount,
      failedCount: result.failedCount,
      durationMs: Date.now() - started,
      branch: options.branch,
      batch: options.batch,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bulk recalculation failed";
    await failJob(jobId, message);
  }
}

export async function runCompanyMatchingJob(
  jobId: string,
  requirementId: string,
  options: { actorUserId: string; actorRole: UserRole }
): Promise<void> {
  const started = Date.now();
  try {
    await startJob(jobId);
    const { runRequirementMatchingWithProgress } = await import(
      "@/lib/services/company-matching"
    );
    const { getRequirementById } = await import("@/lib/services/companies");

    const requirement = await getRequirementById(requirementId);
    if (!requirement) {
      await failJob(jobId, "Company requirement not found");
      return;
    }

    const result = await runRequirementMatchingWithProgress(requirementId, {
      onProgress: async (current, total) => {
        await updateJobProgress(jobId, current, total);
      },
    });

    const { logAudit } = await import("@/lib/services/audit");
    await logAudit({
      actorUserId: options.actorUserId,
      actorRole: options.actorRole,
      action: "MATCHING_RUN",
      entityType: "CompanyRequirement",
      entityId: requirementId,
      description: `Ran matching for ${requirement.roleTitle} at ${requirement.companyName}: ${result.summary.strongFit} strong fits`,
    });

    await completeJob(jobId, {
      requirementId,
      requirementTitle: requirement.roleTitle,
      companyName: requirement.companyName,
      studentsChecked: result.count,
      matchesCreated: result.count,
      strongFit: result.summary.strongFit,
      goodFit: result.summary.goodFit,
      averageFit: result.summary.averageFit,
      riskFit: result.summary.riskFit,
      notFit: result.summary.notFit,
      durationMs: Date.now() - started,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Matching failed";
    await failJob(jobId, message);
  }
}

export async function runStudentImportJob(
  jobId: string,
  options: {
    rows: ImportRow[];
    updateMode: boolean;
    actorUserId: string;
    actorRole: UserRole;
  }
): Promise<void> {
  const started = Date.now();
  try {
    await startJob(jobId);
    const { executeImport, importRowSchema, validateImportRows } = await import(
      "@/lib/services/import"
    );
    const { triggerReadinessRecalculation } = await import(
      "@/lib/services/readiness"
    );

    const parsedRows = options.rows.map((row, index) => {
      const result = importRowSchema.safeParse(row);
      if (!result.success) {
        return {
          rowNumber: index + 2,
          raw: row as unknown as Record<string, string>,
          errors: result.error.errors.map((e) => e.message),
          status: "invalid" as const,
        };
      }
      const stringRow: Record<string, string> = {
        fullName: result.data.fullName,
        rollNumber: result.data.rollNumber,
        email: result.data.email,
        phone: result.data.phone ?? "",
        branch: result.data.branch,
        section: result.data.section ?? "",
        batch: result.data.batch,
        graduationYear: String(result.data.graduationYear),
        cgpa: result.data.cgpa != null ? String(result.data.cgpa) : "",
        activeBacklogs: String(result.data.activeBacklogs ?? 0),
        placementStatus: result.data.placementStatus ?? "NOT_STARTED",
        linkedinUrl: result.data.linkedinUrl ?? "",
        githubUrl: result.data.githubUrl ?? "",
      };
      return { rowNumber: index + 2, raw: stringRow };
    });

    const rawOnly = parsedRows.map((r) => ("raw" in r ? r.raw : r));
    const validated = await validateImportRows(rawOnly, {
      updateMode: options.updateMode,
    });

    const importable = validated.filter(
      (r) => r.status === "valid" || (options.updateMode && r.status === "update")
    );

    if (importable.length === 0) {
      await failJob(jobId, "All rows have validation errors.");
      return;
    }

    await updateJobProgress(jobId, 0, importable.length);

    const result = await executeImport(validated, { updateMode: options.updateMode });

    let processed = 0;
    for (const studentId of result.studentIds) {
      await triggerReadinessRecalculation(studentId);
      processed += 1;
      if (processed % 10 === 0 || processed === result.studentIds.length) {
        await updateJobProgress(jobId, processed, importable.length);
      }
    }

    const duplicateCount = validated.filter((r) => r.status === "duplicate").length;
    const invalidCount = validated.filter((r) => r.status === "invalid").length;

    const { logAudit } = await import("@/lib/services/audit");
    await logAudit({
      actorUserId: options.actorUserId,
      actorRole: options.actorRole,
      action: "STUDENTS_IMPORTED",
      entityType: "Student",
      description: `Imported ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`,
    });

    await completeJob(jobId, {
      importedCount: result.created,
      updatedCount: result.updated,
      skippedCount: result.skipped,
      invalidCount,
      duplicateCount,
      durationMs: Date.now() - started,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    await failJob(jobId, message);
  }
}

export async function runGitHubSyncJob(
  jobId: string,
  options: {
    studentIds: string[];
    actorUserId: string;
    actorRole: UserRole;
  }
): Promise<void> {
  const started = Date.now();
  try {
    await startJob(jobId);
    const { syncGitHubBulkWithProgress } = await import("@/lib/services/github");
    const { triggerReadinessRecalculation } = await import(
      "@/lib/services/readiness"
    );

    const result = await syncGitHubBulkWithProgress({
      studentIds: options.studentIds,
      actorUserId: options.actorUserId,
      actorRole: options.actorRole,
      onProgress: async (current, total) => {
        await updateJobProgress(jobId, current, total);
      },
    });

    for (const studentId of options.studentIds) {
      await triggerReadinessRecalculation(studentId);
    }

    await completeJob(jobId, {
      totalStudents: options.studentIds.length,
      syncedCount: result.syncedCount,
      failedCount: result.failedCount,
      rateLimitedCount: result.rateLimitedCount,
      durationMs: Date.now() - started,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub sync failed";
    await failJob(jobId, message);
  }
}

export async function runSkillEvidenceRefreshJob(
  jobId: string,
  options: {
    studentIds: string[];
    actorUserId: string;
    actorRole: UserRole;
  }
): Promise<void> {
  const started = Date.now();
  try {
    await startJob(jobId);
    const { generateSkillEvidenceForManyStudents } = await import(
      "@/lib/services/skill-evidence"
    );

    const result = await generateSkillEvidenceForManyStudents(
      options.studentIds,
      {
        actorUserId: options.actorUserId,
        actorRole: options.actorRole,
        onProgress: async (current, total) => {
          await updateJobProgress(jobId, current, total);
        },
      }
    );

    await completeJob(jobId, {
      totalStudents: options.studentIds.length,
      processedCount: result.processed,
      failedCount: result.failed,
      durationMs: Date.now() - started,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Skill evidence refresh failed";
    await failJob(jobId, message);
  }
}
