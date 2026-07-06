"use client";

import {
  ReadinessFilterBarSuspense,
  ReadinessTable,
} from "@/components/readiness/ReadinessManagement";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableSkeleton } from "@/components/ui/LoadingSkeleton";
import type { PaginatedResult } from "@/types";
import type { ReadinessOverviewItem } from "@/types/readiness";
import { Gauge } from "lucide-react";
import { Suspense } from "react";

interface ReadinessPageClientProps {
  result: PaginatedResult<ReadinessOverviewItem>;
  branches: string[];
  batches: string[];
  basePath: string;
  jobsBasePath: string;
  studentsBasePath: string;
  canRecalculate: boolean;
}

export function ReadinessPageClient({
  result,
  branches,
  batches,
  basePath,
  jobsBasePath,
  studentsBasePath,
  canRecalculate,
}: ReadinessPageClientProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Placement Readiness"
        description="Intelligence scores, risk levels, and recommended actions across students."
      />

      <ReadinessFilterBarSuspense
        branches={branches}
        batches={batches}
        basePath={basePath}
        jobsBasePath={jobsBasePath}
        canRecalculate={canRecalculate}
      />

      {result.data.length === 0 ? (
        <EmptyState
          icon={Gauge}
          title="No students match filters"
          description="Adjust filters or recalculate readiness for all students."
        />
      ) : (
        <>
          <p className="text-sm text-slate-500">
            Showing {result.data.length} of {result.total} students
          </p>
          <Suspense fallback={<TableSkeleton />}>
            <ReadinessTable
              rows={result.data}
              studentsBasePath={studentsBasePath}
              basePath={basePath}
              page={result.page}
              totalPages={result.totalPages}
              canRecalculate={canRecalculate}
            />
          </Suspense>
        </>
      )}
    </div>
  );
}
