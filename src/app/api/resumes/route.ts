import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { getResumeList } from "@/lib/services/resumes";
import type { ResumeReviewStatus } from "@/types";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "resume:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const atsParam = searchParams.get("atsFriendly");
  let atsFriendly: boolean | undefined;
  if (atsParam === "true") atsFriendly = true;
  if (atsParam === "false") atsFriendly = false;

  const result = await getResumeList({
    search: searchParams.get("search") ?? undefined,
    branch: searchParams.get("branch") ?? undefined,
    batch: searchParams.get("batch") ?? undefined,
    reviewStatus:
      (searchParams.get("reviewStatus") as ResumeReviewStatus) ?? undefined,
    scoreMin: searchParams.get("scoreMin")
      ? Number(searchParams.get("scoreMin"))
      : undefined,
    scoreMax: searchParams.get("scoreMax")
      ? Number(searchParams.get("scoreMax"))
      : undefined,
    atsFriendly,
    page: Number(searchParams.get("page")) || 1,
    pageSize: Number(searchParams.get("pageSize")) || 10,
  });

  return NextResponse.json(result);
}
