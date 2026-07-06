import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { createHrUser } from "@/lib/services/hr-access";
import { createHrUserSchema } from "@/lib/validations/sharing";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "hr_access:manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createHrUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const user = await createHrUser(parsed.data);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "HR_ACCESS_ASSIGNED",
      entityType: "User",
      entityId: user.id,
      description: `Created HR user ${user.name} (${user.email})`,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create HR user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
