import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { authenticateUser, createSession, toPublicSessionUser } from "@/lib/auth";
import { ROLE_DASHBOARD_PATH } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit-middleware";
import { logAudit } from "@/lib/services/audit";
import { loginSchema } from "@/lib/validations/student";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const limited = await withRateLimit(request, "login", RATE_LIMITS.login);
  if (limited) return limited;

  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message ?? "Invalid input",
        400
      );
    }

    const email = parsed.data.email.toLowerCase();
    const user = await authenticateUser(email, parsed.data.password);

    if (!user) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { role: true },
      });

      try {
        await logAudit({
          actorRole: existingUser?.role ?? null,
          action: "LOGIN_FAILED",
          description: `Failed login attempt for ${email}`,
        });
      } catch (auditError) {
        logger.warn("Login audit log failed", {
          action: "login",
          route: "/api/auth/login",
          cause: auditError,
        });
      }

      logger.warn("Login failed", { action: "login", route: "/api/auth/login" });

      return apiError(
        "UNAUTHORIZED",
        "Invalid email or password.",
        401
      );
    }

    await createSession(user.id);

    try {
      await logAudit({
        actorUserId: user.id,
        actorRole: user.role,
        action: "LOGIN_SUCCESS",
        entityType: "User",
        entityId: user.id,
        description: `${user.name} signed in`,
      });
    } catch (auditError) {
      logger.warn("Login audit log failed", {
        action: "login",
        route: "/api/auth/login",
        userId: user.id,
        cause: auditError,
      });
    }

    logger.info("Login success", {
      action: "login",
      userId: user.id,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      user: toPublicSessionUser(user),
      redirectTo: ROLE_DASHBOARD_PATH[user.role],
    });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/auth/login",
      action: "login",
      fallbackMessage: "An unexpected error occurred.",
    });
  }
}
