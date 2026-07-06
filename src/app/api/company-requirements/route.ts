import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import {
  createRequirement,
  getRequirements,
} from "@/lib/services/companies";
import { companyRequirementSchema } from "@/lib/validations/company";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "requirements:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const page = Number(searchParams.get("page")) || 1;

  const result = await getRequirements({ companyId, status, search, page });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "requirements:manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = companyRequirementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const requirement = await createRequirement(parsed.data, session.id);

    const fromJdParser =
      typeof body === "object" &&
      body !== null &&
      (body as { source?: string }).source === "jd_parser";

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: fromJdParser
        ? "REQUIREMENT_CREATED_FROM_JD_PARSER"
        : "REQUIREMENT_CREATED",
      entityType: "CompanyRequirement",
      entityId: requirement.id,
      description: fromJdParser
        ? `Created requirement draft from JD parser: ${requirement.roleTitle} for ${requirement.companyName}`
        : `Created requirement ${requirement.roleTitle} for ${requirement.companyName}`,
    });

    return NextResponse.json(requirement, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create requirement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
