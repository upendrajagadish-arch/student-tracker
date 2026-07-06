import { JobsListClient } from "@/components/jobs/JobsListClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireSession } from "@/lib/auth";
import { getRolePrefix } from "@/lib/permissions";
import { canUserListJobs, listJobs } from "@/lib/services/jobs";
import type { JobStatus, JobType } from "@/types/jobs";
import type { UserRole } from "@/types";
import { notFound } from "next/navigation";

export async function JobsListPageContent({
  role,
  searchParams,
}: {
  role: UserRole;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!canUserListJobs(role)) notFound();

  const session = await requireSession();
  const params = await searchParams;
  const basePath = `${getRolePrefix(role)}/jobs`;
  const page = Number(params.page) || 1;

  const result = await listJobs(
    {
      status:
        typeof params.status === "string"
          ? (params.status as JobStatus)
          : undefined,
      jobType:
        typeof params.jobType === "string"
          ? (params.jobType as JobType)
          : undefined,
      search: typeof params.search === "string" ? params.search : undefined,
      from: typeof params.from === "string" ? params.from : undefined,
      to: typeof params.to === "string" ? params.to : undefined,
      page,
    },
    { userId: session.id, role: session.role }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Background Jobs"
        description="Track long-running operations like bulk readiness recalculation, company matching, and large imports."
      />
      <JobsListClient
        jobs={result.data}
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        basePath={basePath}
      />
    </div>
  );
}
