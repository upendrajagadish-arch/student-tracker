import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import {
  removeStudentTechSkill,
  updateStudentTechSkill,
} from "@/lib/services/tech-stack";
import { studentTechSkillUpdateSchema } from "@/lib/validations/tech-stack";
import { VERIFIED_STATUSES } from "@/lib/tech-constants";
import { triggerReadinessRecalculation } from "@/lib/services/readiness";
import type { VerificationStatus } from "@/types/tech-stack";

interface RouteParams {
  params: Promise<{ id: string; skillId: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "techstack:manage_skills")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { skillId, id: studentId } = await params;

  try {
    const body = await request.json();
    const parsed = studentTechSkillUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const skill = await updateStudentTechSkill(
      skillId,
      parsed.data,
      session.id
    );

    const isVerify =
      parsed.data.verificationStatus &&
      VERIFIED_STATUSES.includes(
        parsed.data.verificationStatus as VerificationStatus
      );

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: isVerify ? "SKILL_VERIFIED" : "SKILL_UPDATED",
      entityType: "StudentTechSkill",
      entityId: skill.id,
      description: `${isVerify ? "Verified" : "Updated"} skill ${skill.skillName}`,
    });

    await triggerReadinessRecalculation(studentId);

    return NextResponse.json(skill);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "techstack:delete")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { skillId, id: studentId } = await params;

  await removeStudentTechSkill(skillId);

  await logAudit({
    actorUserId: session.id,
    actorRole: session.role,
    action: "SKILL_REMOVED",
    entityType: "StudentTechSkill",
    entityId: skillId,
    description: "Removed skill from student",
  });

  await triggerReadinessRecalculation(studentId);

  return NextResponse.json({ success: true });
}
