"use client";

import { ResumeFilterBarSuspense, ResumeTable } from "@/components/resumes/ResumeManagement";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableSkeleton } from "@/components/ui/LoadingSkeleton";
import type { PaginatedResult, ResumeListItem } from "@/types";
import { FileText } from "lucide-react";
import { Suspense } from "react";

interface ResumesPageClientProps {
  result: PaginatedResult<ResumeListItem>;
  branches: string[];
  batches: string[];
  basePath: string;
  studentsBasePath: string;
  canDownload: boolean;
}

export function ResumesPageClient({
  result,
  branches,
  batches,
  basePath,
  studentsBasePath,
  canDownload,
}: ResumesPageClientProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Resume Management"
        description="Review uploaded resumes, scores, and ATS readiness across students."
      />

      <ResumeFilterBarSuspense
        branches={branches}
        batches={batches}
        basePath={basePath}
      />

      {result.data.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No resumes found"
          description="Upload resumes from student detail pages or adjust your filters."
        />
      ) : (
        <>
          <p className="text-sm text-slate-500">
            Showing {result.data.length} of {result.total} active resumes
          </p>
          <Suspense fallback={<TableSkeleton />}>
            <ResumeTable
              resumes={result.data}
              studentsBasePath={studentsBasePath}
              page={result.page}
              totalPages={result.totalPages}
              canDownload={canDownload}
            />
          </Suspense>
        </>
      )}
    </div>
  );
}
