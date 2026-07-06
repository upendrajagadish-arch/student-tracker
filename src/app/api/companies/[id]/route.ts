import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import {
  getCompanyById,
  setCompanyActive,
  updateCompany,
} from "@/lib/services/companies";
import { companySchema } from "@/lib/validations/company";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "companies:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const company = await getCompanyById(id);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json(company);
}

export async function PUT(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "companies:manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = companySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const company = await updateCompany(id, parsed.data);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "COMPANY_UPDATED",
      entityType: "Company",
      entityId: company.id,
      description: `Updated company ${company.name}`,
    });

    return NextResponse.json(company);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update company";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "companies:manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive must be a boolean" },
        { status: 400 }
      );
    }

    const existing = await getCompanyById(id);
    if (!existing) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    await setCompanyActive(id, body.isActive);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: body.isActive ? "COMPANY_ACTIVATED" : "COMPANY_DEACTIVATED",
      entityType: "Company",
      entityId: id,
      description: `${body.isActive ? "Activated" : "Deactivated"} company ${existing.name}`,
    });

    return NextResponse.json({ success: true, isActive: body.isActive });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update company status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
