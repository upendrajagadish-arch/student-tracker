import { NextResponse } from "next/server";
import { importErrorMessage, unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit-middleware";
import {
  parseImportFile,
  validateImportRows,
  type ParsedImportRow,
} from "@/lib/services/import";

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
    const formData = await request.formData();
    const file = formData.get("file");
    const updateMode = formData.get("updateMode") === "true";

    if (!file || !(file instanceof File)) {
      return apiError(
        "BAD_REQUEST",
        "Please select a CSV or Excel file to import.",
        400
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawRows = await parseImportFile(buffer, file.name);

    if (rawRows.length === 0) {
      return apiError(
        "BAD_REQUEST",
        "The file has no student rows. Add data below the header row.",
        400
      );
    }

    if (rawRows.length > 5000) {
      return apiError(
        "BAD_REQUEST",
        "File exceeds maximum of 5,000 rows",
        400
      );
    }

    const rows = await validateImportRows(rawRows, { updateMode });
    const summary = summarizeRows(rows);

    return NextResponse.json({ success: true, summary, rows });
  } catch (error) {
    return apiError(
      "BAD_REQUEST",
      importErrorMessage(error),
      400,
      { route: "/api/students/import/preview", cause: error }
    );
  }
}

function summarizeRows(rows: ParsedImportRow[]) {
  return {
    total: rows.length,
    valid: rows.filter((r) => r.status === "valid").length,
    update: rows.filter((r) => r.status === "update").length,
    duplicate: rows.filter((r) => r.status === "duplicate").length,
    invalid: rows.filter((r) => r.status === "invalid").length,
  };
}
