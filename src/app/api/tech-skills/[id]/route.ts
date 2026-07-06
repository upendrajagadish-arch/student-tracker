import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { updateTechSkill } from "@/lib/services/tech-stack";
import { techSkillMasterSchema } from "@/lib/validations/tech-stack";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "techstack:manage_master")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = techSkillMasterSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const skill = await updateTechSkill(id, parsed.data);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "SKILL_MASTER_UPDATED",
      entityType: "TechSkill",
      entityId: skill.id,
      description: `Updated skill master: ${skill.name}`,
    });

    return NextResponse.json(skill);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
