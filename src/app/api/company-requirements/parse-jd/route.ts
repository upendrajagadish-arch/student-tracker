import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canParseJobDescription } from "@/lib/permissions";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit-middleware";
import { logAudit } from "@/lib/services/audit";
import { getCompanyById } from "@/lib/services/companies";
import {
  jdTextPreview,
  parseJobDescription,
} from "@/lib/services/jd-parser";
import { parseJdRequestSchema } from "@/lib/validations/jd-parser";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !canParseJobDescription(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  const limited = await withRateLimit(
    request,
    "jd_parse",
    RATE_LIMITS.jdParse,
    session.id
  );
  if (limited) return limited;

  try {
    const body = await request.json();
    const parsed = parseJdRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "BAD_REQUEST",
        parsed.error.errors[0]?.message ?? "Invalid request.",
        400
      );
    }

    let companyName = parsed.data.companyName?.trim() || undefined;
    if (parsed.data.companyId) {
      const company = await getCompanyById(parsed.data.companyId);
      if (!company) {
        return apiError("NOT_FOUND", "Company not found.", 404);
      }
      companyName = company.name;
    }

    const result = await parseJobDescription(
      {
        jdText: parsed.data.jdText,
        companyId: parsed.data.companyId,
        companyName,
        roleHint: parsed.data.roleHint,
      },
      companyName ?? null
    );

    await prisma.jDParseLog.create({
      data: {
        userId: session.id,
        companyId: parsed.data.companyId ?? null,
        rawTextPreview: jdTextPreview(parsed.data.jdText),
        parsedJson: JSON.stringify(result.draft),
        confidenceScore: result.confidenceScore,
        provider: result.provider,
      },
    });

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "JD_PARSED",
      entityType: "JDParseLog",
      entityId: parsed.data.companyId ?? undefined,
      description: `Parsed JD draft (${result.provider}, confidence ${Math.round(result.confidenceScore * 100)}%)${companyName ? ` for ${companyName}` : ""}`,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    await logAudit({
      actorUserId: session?.id,
      actorRole: session?.role,
      action: "JD_PARSE_FAILED",
      entityType: "JDParseLog",
      description: "JD parse failed",
    }).catch(() => undefined);

    return apiErrorFromUnknown(error, {
      route: "/api/company-requirements/parse-jd",
      action: "parse_jd",
      fallbackMessage:
        "Could not parse the job description. Try again or create the requirement manually.",
    });
  }
}
