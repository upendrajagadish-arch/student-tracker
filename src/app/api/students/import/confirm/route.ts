import { NextResponse } from "next/server";
import { importErrorMessage, unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { LARGE_IMPORT_JOB_THRESHOLD } from "@/lib/job-constants";
import { hasPermission } from "@/lib/permissions";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit-middleware";
import { logAudit } from "@/lib/services/audit";
import { triggerReadinessRecalculation } from "@/lib/services/readiness";
import {
  executeImport,
  importRowSchema,
  validateImportRows,
} from "@/lib/services/import";
import { createJob } from "@/lib/services/jobs";
import {
  runStudentImportJob,
  scheduleJobExecution,
} from "@/lib/services/job-runners";
import type { ImportRow } from "@/types/import";

function parseImportRows(rows: ImportRow[]) {
  return rows.map((row, index) => {
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
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "students:import")) {
    return apiError(
      "UNAUTHORIZED",
      unauthorizedMessage(session?.role),
      401
    );
  }

  const limited = await withRateLimit(
    request,
    "import",
    RATE_LIMITS.import,
    session.id
  );
  if (limited) return limited;

  try {
    const body = await request.json();
    const updateMode = body.updateMode === true;
    const rows: ImportRow[] = body.rows ?? [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return apiError(
        "BAD_REQUEST",
        "No student rows were submitted for import.",
        400
      );
    }

    const parsedRows = parseImportRows(rows);
    const rawOnly = parsedRows.map((r) => ("raw" in r ? r.raw : r));
    const validated = await validateImportRows(rawOnly, { updateMode });

    const importable = validated.filter(
      (r) =>
        r.status === "valid" || (updateMode && r.status === "update")
    );

    if (importable.length === 0) {
      return apiError(
        "BAD_REQUEST",
        "All rows have validation errors. Fix the preview and try again.",
        400
      );
    }

    if (importable.length >= LARGE_IMPORT_JOB_THRESHOLD) {
      const job = await createJob({
        jobType: "STUDENT_IMPORT",
        title: `Student import (${importable.length} rows)`,
        description: `Importing ${importable.length.toLocaleString()} student records`,
        createdByUserId: session.id,
        progressTotal: importable.length,
      });

      scheduleJobExecution(() =>
        runStudentImportJob(job.id, {
          rows,
          updateMode,
          actorUserId: session.id,
          actorRole: session.role,
        })
      );

      return NextResponse.json({
        success: true,
        jobId: job.id,
        status: job.status,
        async: true,
        message: `Import job started for ${importable.length} rows. Track progress on the Jobs page.`,
      });
    }

    const result = await executeImport(validated, { updateMode });

    await Promise.all(
      result.studentIds.map((studentId) =>
        triggerReadinessRecalculation(studentId)
      )
    );

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "STUDENTS_IMPORTED",
      entityType: "Student",
      description: `Imported ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/students/import/confirm",
      action: "import_confirm",
      fallbackMessage: importErrorMessage(error),
      fallbackCode: "INTERNAL_ERROR",
    });
  }
}
