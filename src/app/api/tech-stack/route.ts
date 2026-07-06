import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getTechStackOverview } from "@/lib/services/tech-stack";
import type {
  ProficiencyLevel,
  SkillCategory,
  VerificationStatus,
} from "@/types/tech-stack";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "techstack:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const result = await getTechStackOverview({
    search: searchParams.get("search") ?? undefined,
    branch: searchParams.get("branch") ?? undefined,
    batch: searchParams.get("batch") ?? undefined,
    techSkillId: searchParams.get("techSkillId") ?? undefined,
    category: (searchParams.get("category") as SkillCategory) ?? undefined,
    proficiencyLevel:
      (searchParams.get("proficiencyLevel") as ProficiencyLevel) ?? undefined,
    verificationStatus:
      (searchParams.get("verificationStatus") as VerificationStatus) ??
      undefined,
    roleInterest: searchParams.get("roleInterest") ?? undefined,
    page: Number(searchParams.get("page")) || 1,
  });

  return NextResponse.json(result);
}
