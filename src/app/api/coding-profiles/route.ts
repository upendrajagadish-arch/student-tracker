import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canViewCodingPlatforms } from "@/lib/permissions";
import { getCodingProfileOverview } from "@/lib/services/coding-platforms";
import type {
  CodingProfileDataSource,
  CodingProfileVerificationStatus,
} from "@/types/coding-platforms";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !canViewCodingPlatforms(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const result = await getCodingProfileOverview({
    search: searchParams.get("search") ?? undefined,
    branch: searchParams.get("branch") ?? undefined,
    batch: searchParams.get("batch") ?? undefined,
    platformId: searchParams.get("platformId") ?? undefined,
    platformSlug: searchParams.get("platformSlug") ?? undefined,
    verificationStatus: searchParams.get("verificationStatus")
      ? (searchParams.get("verificationStatus") as CodingProfileVerificationStatus)
      : undefined,
    dataSource: searchParams.get("dataSource")
      ? (searchParams.get("dataSource") as CodingProfileDataSource)
      : undefined,
    minEvidenceScore: searchParams.get("minEvidenceScore")
      ? Number(searchParams.get("minEvidenceScore"))
      : undefined,
    page: Number(searchParams.get("page")) || 1,
    pageSize: Number(searchParams.get("pageSize")) || 20,
  });

  return NextResponse.json(result);
}
