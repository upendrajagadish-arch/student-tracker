import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canManageBranding } from "@/lib/permissions";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit-middleware";
import { logAudit } from "@/lib/services/audit";
import { toPublicBranding } from "@/lib/services/app-settings";
import { uploadInstitutionLogo } from "@/lib/services/branding-logo";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !canManageBranding(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 403);
  }

  const limited = await withRateLimit(
    request,
    "branding_logo",
    RATE_LIMITS.resumeUpload,
    session.id
  );
  if (limited) return limited;

  try {
    const formData = await request.formData();
    const file = formData.get("logo");
    if (!file || !(file instanceof File)) {
      return apiError("BAD_REQUEST", "Logo file is required.", 400);
    }

    const { settings } = await uploadInstitutionLogo(file, session.id);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "INSTITUTION_LOGO_UPLOADED",
      entityType: "AppSettings",
      entityId: settings.id,
      description: `Uploaded institution logo for ${settings.institutionName}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        settings,
        branding: toPublicBranding(settings),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Logo upload failed.";
    return apiErrorFromUnknown(error, {
      route: "/api/settings/branding/logo",
      action: "upload_logo",
      fallbackMessage: message,
    });
  }
}
