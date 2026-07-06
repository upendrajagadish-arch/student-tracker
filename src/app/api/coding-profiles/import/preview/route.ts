import { NextResponse } from "next/server";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { unauthorizedMessage } from "@/lib/api-errors";
import { getSession } from "@/lib/auth";
import { canImportCodingProfiles } from "@/lib/permissions";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit-middleware";
import {
  parseCodingPlatformImportFile,
  validateCodingImportRows,
} from "@/lib/services/coding-platform-import";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !canImportCodingProfiles(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  const limited = await withRateLimit(
    request,
    "coding_import",
    RATE_LIMITS.import,
    session.id
  );
  if (limited) return limited;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const updateMode = formData.get("updateMode") === "true";

    if (!file || !(file instanceof File)) {
      return apiError("BAD_REQUEST", "Please select a CSV or Excel file.", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawRows = await parseCodingPlatformImportFile(buffer, file.name);

    if (rawRows.length === 0) {
      return apiError("BAD_REQUEST", "The file has no data rows.", 400);
    }

    const validated = await validateCodingImportRows(rawRows, { updateMode });

    return NextResponse.json({
      totalRows: rawRows.length,
      validCount: validated.filter((r) => r.status === "valid").length,
      updateCount: validated.filter((r) => r.status === "update").length,
      invalidCount: validated.filter((r) => r.status === "invalid").length,
      unknownStudentCount: validated.filter(
        (r) => r.status === "unknown_student"
      ).length,
      unknownPlatformCount: validated.filter(
        (r) => r.status === "unknown_platform"
      ).length,
      rows: validated,
      updateMode,
    });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/coding-profiles/import/preview",
      action: "coding_import_preview",
      fallbackMessage: "Import preview failed.",
    });
  }
}
