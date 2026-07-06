import { ResumesPageClient } from "@/components/resumes/ResumesPageClient";
import {
  canDownloadResume,
  canViewResume,
} from "@/lib/permissions";
import { getResumeList } from "@/lib/services/resumes";
import {
  getDistinctBatches,
  getDistinctBranches,
} from "@/lib/services/students";
import type { ResumeFilters, ResumeReviewStatus, UserRole } from "@/types";
import { notFound } from "next/navigation";

export async function ResumesListPageContent({
  role,
  basePath,
  studentsBasePath,
  searchParams,
}: {
  role: UserRole;
  basePath: string;
  studentsBasePath: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!canViewResume(role)) notFound();

  const params = await searchParams;
  const filters: ResumeFilters = {
    search: typeof params.search === "string" ? params.search : undefined,
    branch: typeof params.branch === "string" ? params.branch : undefined,
    batch: typeof params.batch === "string" ? params.batch : undefined,
    reviewStatus:
      typeof params.reviewStatus === "string"
        ? (params.reviewStatus as ResumeReviewStatus)
        : undefined,
    scoreMin: params.scoreMin ? Number(params.scoreMin) : undefined,
    scoreMax: params.scoreMax ? Number(params.scoreMax) : undefined,
    page: Number(params.page) || 1,
  };

  if (params.atsFriendly === "true") filters.atsFriendly = true;
  if (params.atsFriendly === "false") filters.atsFriendly = false;

  const [result, branches, batches] = await Promise.all([
    getResumeList(filters),
    getDistinctBranches(),
    getDistinctBatches(),
  ]);

  return (
    <ResumesPageClient
      result={result}
      branches={branches}
      batches={batches}
      basePath={basePath}
      studentsBasePath={studentsBasePath}
      canDownload={canDownloadResume(role)}
    />
  );
}
