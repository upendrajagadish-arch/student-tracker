import { NextResponse } from "next/server";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { unauthorizedMessage } from "@/lib/api-errors";
import { getSession } from "@/lib/auth";
import { canImportCodingProfiles } from "@/lib/permissions";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit-middleware";
import {
  executeCodingImport,
} from "@/lib/services/coding-platform-import";
import type { ParsedCodingImportRow } from "@/types/coding-platforms";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !canImportCodingProfiles(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  const limited = await withRateLimit(
    request,
    "coding_import_confirm",
    RATE_LIMITS.import,
    session.id
  );
  if (limited) return limited;

  try {
    const body = await request.json();
    const rows = body.rows as ParsedCodingImportRow[];
    const updateMode = Boolean(body.updateMode);

    if (!Array.isArray(rows) || rows.length === 0) {
      return apiError("BAD_REQUEST", "No import rows provided.", 400);
    }

    const result = await executeCodingImport(rows, {
      updateMode,
      actorUserId: session.id,
      actorRole: session.role,
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: `Imported ${result.created} profiles, updated ${result.updated}.`,
    });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/coding-profiles/import/confirm",
      action: "coding_import_confirm",
      fallbackMessage: "Import failed.",
    });
  }
}
