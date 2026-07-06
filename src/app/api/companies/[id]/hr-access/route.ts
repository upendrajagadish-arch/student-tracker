import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import {
  assignHrAccess,
  getHrAccessForCompany,
  setHrAccessActive,
} from "@/lib/services/hr-access";
import { assignHrAccessSchema } from "@/lib/validations/sharing";
import { getCompanyById } from "@/lib/services/companies";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "hr_access:manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const access = await getHrAccessForCompany(id);
  return NextResponse.json(access);
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "hr_access:manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: companyId } = await params;
  const company = await getCompanyById(companyId);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = assignHrAccessSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const access = await assignHrAccess(
      companyId,
      parsed.data.userId,
      parsed.data.accessRole,
      session.id
    );

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "HR_ACCESS_ASSIGNED",
      entityType: "HRCompanyAccess",
      entityId: access.id,
      description: `Assigned ${access.userName} to ${company.name} as ${parsed.data.accessRole}`,
    });

    return NextResponse.json(access, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to assign HR access";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "hr_access:manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: companyId } = await params;

  try {
    const body = await request.json();
    const { accessId, isActive } = body;
    if (!accessId || typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    await setHrAccessActive(accessId, isActive);

    const company = await getCompanyById(companyId);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: isActive ? "HR_ACCESS_ASSIGNED" : "HR_ACCESS_DEACTIVATED",
      entityType: "HRCompanyAccess",
      entityId: accessId,
      description: `${isActive ? "Reactivated" : "Deactivated"} HR access for ${company?.name ?? companyId}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update access";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
