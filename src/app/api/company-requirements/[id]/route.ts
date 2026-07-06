import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import {
  getRequirementById,
  updateRequirement,
  updateRequirementStatus,
} from "@/lib/services/companies";
import { companyRequirementSchema } from "@/lib/validations/company";
import type { CompanyRequirementStatus } from "@/types/company";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "requirements:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const requirement = await getRequirementById(id);
  if (!requirement) {
    return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
  }

  return NextResponse.json(requirement);
}

export async function PUT(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "requirements:manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = companyRequirementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const requirement = await updateRequirement(id, parsed.data);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "REQUIREMENT_UPDATED",
      entityType: "CompanyRequirement",
      entityId: requirement.id,
      description: `Updated requirement ${requirement.roleTitle}`,
    });

    return NextResponse.json(requirement);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update requirement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "requirements:manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const status = body.status as CompanyRequirementStatus;
    if (!["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const requirement = await updateRequirementStatus(id, status);

    if (status === "CLOSED") {
      await logAudit({
        actorUserId: session.id,
        actorRole: session.role,
        action: "REQUIREMENT_CLOSED",
        entityType: "CompanyRequirement",
        entityId: requirement.id,
        description: `Closed requirement ${requirement.roleTitle}`,
      });
    } else {
      await logAudit({
        actorUserId: session.id,
        actorRole: session.role,
        action: "REQUIREMENT_UPDATED",
        entityType: "CompanyRequirement",
        entityId: requirement.id,
        description: `Changed requirement status to ${status}`,
      });
    }

    return NextResponse.json(requirement);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
