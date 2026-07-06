import { NextResponse } from "next/server";
import { analyticsExportErrorMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canExportAnalytics } from "@/lib/permissions";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit-middleware";
import { logAudit } from "@/lib/services/audit";
import { exportAnalyticsToExcel } from "@/lib/services/analytics-export";
import {
  getAnalyticsBundle,
  parseAnalyticsFilters,
} from "@/lib/services/analytics";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !canExportAnalytics(session.role)) {
    return apiError(
      "UNAUTHORIZED",
      analyticsExportErrorMessage(401),
      401
    );
  }

  const limited = await withRateLimit(
    request,
    "analytics_export",
    RATE_LIMITS.analyticsExport,
    session.id
  );
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    const filters = parseAnalyticsFilters(
      Object.fromEntries(url.searchParams.entries())
    );

    const data = await getAnalyticsBundle(filters);
    const buffer = await exportAnalyticsToExcel(data);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "ANALYTICS_EXPORTED",
      entityType: "Analytics",
      description: "Exported placement analytics summary to Excel",
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="placementiq-analytics.xlsx"`,
      },
    });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/analytics/export",
      action: "analytics_export",
      fallbackMessage: analyticsExportErrorMessage(500),
    });
  }
}
