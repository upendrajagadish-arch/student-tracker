import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canViewGitHub } from "@/lib/permissions";
import { getGitHubOverview } from "@/lib/services/github";
import type { GitHubSyncStatus } from "@/types/github";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !canViewGitHub(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const syncStatus = searchParams.get("syncStatus");

  const result = await getGitHubOverview({
    search: searchParams.get("search") ?? undefined,
    branch: searchParams.get("branch") ?? undefined,
    batch: searchParams.get("batch") ?? undefined,
    syncStatus: syncStatus
      ? (syncStatus as GitHubSyncStatus)
      : undefined,
    language: searchParams.get("language") ?? undefined,
    minEvidenceScore: searchParams.get("minEvidenceScore")
      ? Number(searchParams.get("minEvidenceScore"))
      : undefined,
    page: Number(searchParams.get("page")) || 1,
    pageSize: Number(searchParams.get("pageSize")) || 20,
  });

  return NextResponse.json(result);
}
