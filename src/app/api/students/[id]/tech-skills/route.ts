import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import {
  addStudentTechSkill,
  getStudentRoleInterests,
  getStudentTechSkills,
} from "@/lib/services/tech-stack";
import { studentTechSkillSchema } from "@/lib/validations/tech-stack";
import { triggerReadinessRecalculation } from "@/lib/services/readiness";
import { getStudentById } from "@/lib/services/students";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "techstack:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [skills, roleInterests] = await Promise.all([
    getStudentTechSkills(id),
    getStudentRoleInterests(id),
  ]);

  return NextResponse.json({ skills, roleInterests });
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "techstack:manage_skills")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: studentId } = await params;
  const student = await getStudentById(studentId);
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = studentTechSkillSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const skill = await addStudentTechSkill(
      studentId,
      parsed.data,
      session.id
    );

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "SKILL_ADDED",
      entityType: "StudentTechSkill",
      entityId: skill.id,
      description: `Added ${skill.skillName} to ${student.fullName}`,
    });

    await triggerReadinessRecalculation(studentId);

    return NextResponse.json(skill, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Skill already assigned to student" },
      { status: 409 }
    );
  }
}
