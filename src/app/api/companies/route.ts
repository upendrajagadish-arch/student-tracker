import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { createCompany, getCompanies } from "@/lib/services/companies";
import { companySchema } from "@/lib/validations/company";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "companies:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const isActiveParam = searchParams.get("isActive");
  const isActive =
    isActiveParam === "true"
      ? true
      : isActiveParam === "false"
        ? false
        : undefined;
  const page = Number(searchParams.get("page")) || 1;

  const result = await getCompanies({ search, isActive, page });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "companies:manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = companySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const company = await createCompany(parsed.data);

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "COMPANY_CREATED",
      entityType: "Company",
      entityId: company.id,
      description: `Created company ${company.name}`,
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create company";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
