import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import {
  createTechSkill,
  getActiveTechSkills,
  getAllTechSkills,
  updateTechSkill,
} from "@/lib/services/tech-stack";
import { techSkillMasterSchema } from "@/lib/validations/tech-stack";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "techstack:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "true";

  const skills = all && hasPermission(session.role, "techstack:manage_master")
    ? await getAllTechSkills()
    : await getActiveTechSkills();

  return NextResponse.json(skills);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "techstack:manage_master")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = techSkillMasterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const skill = await createTechSkill(parsed.data);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "SKILL_MASTER_CREATED",
      entityType: "TechSkill",
      entityId: skill.id,
      description: `Created skill master: ${skill.name}`,
    });

    return NextResponse.json(skill, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Skill name already exists" },
      { status: 409 }
    );
  }
}
