import { GitHubPageClientShell } from "@/components/github/GitHubPageClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { canSyncGitHub, canViewGitHub, getRolePrefix } from "@/lib/permissions";
import { getGitHubRateLimitWarning } from "@/lib/github-config";
import { getGitHubOverview } from "@/lib/services/github";
import {
  getDistinctBatches,
  getDistinctBranches,
} from "@/lib/services/students";
import type { GitHubFilters, GitHubSyncStatus } from "@/types/github";
import type { UserRole } from "@/types";
import { AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";

export async function GitHubListPageContent({
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
  if (!canViewGitHub(role)) notFound();

  const params = await searchParams;
  const filters: GitHubFilters = {
    search: typeof params.search === "string" ? params.search : undefined,
    branch: typeof params.branch === "string" ? params.branch : undefined,
    batch: typeof params.batch === "string" ? params.batch : undefined,
    syncStatus:
      typeof params.syncStatus === "string"
        ? (params.syncStatus as GitHubSyncStatus)
        : undefined,
    language: typeof params.language === "string" ? params.language : undefined,
    minEvidenceScore: params.minEvidenceScore
      ? Number(params.minEvidenceScore)
      : undefined,
    page: Number(params.page) || 1,
  };

  const [result, branches, batches] = await Promise.all([
    getGitHubOverview(filters),
    getDistinctBranches(),
    getDistinctBatches(),
  ]);

  const rateLimitWarning = getGitHubRateLimitWarning();

  return (
    <div className="space-y-6">
      <PageHeader
        title="GitHub Evidence"
        description="Track GitHub profiles, languages, and project evidence for students."
      />
      {rateLimitWarning && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{rateLimitWarning}</span>
        </div>
      )}
      <GitHubPageClientShell
        result={result}
        branches={branches}
        batches={batches}
        basePath={basePath}
        jobsBasePath={`${getRolePrefix(role)}/jobs`}
        studentsBasePath={studentsBasePath}
        canSync={canSyncGitHub(role)}
      />
    </div>
  );
}
