import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canManageBranding, canViewBranding } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { getAppSettings, toPublicBranding, updateAppSettings } from "@/lib/services/app-settings";
import type { UpdateAppSettingsInput } from "@/types/branding";

export async function GET() {
  const session = await getSession();
  if (!session || !canViewBranding(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  const settings = await getAppSettings();
  return NextResponse.json({
    success: true,
    data: {
      settings,
      branding: toPublicBranding(settings),
    },
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || !canManageBranding(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 403);
  }

  try {
    const body = (await request.json()) as UpdateAppSettingsInput;
    const settings = await updateAppSettings(body, session.id);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "BRANDING_SETTINGS_UPDATED",
      entityType: "AppSettings",
      entityId: settings.id,
      description: `Updated institution branding for ${settings.institutionName}`,
    });

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/settings/branding",
      action: "update_branding",
      fallbackMessage: "Could not save branding settings.",
    });
  }
}
