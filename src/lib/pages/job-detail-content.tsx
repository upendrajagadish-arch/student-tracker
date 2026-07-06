import { JobDetailClient } from "@/components/jobs/JobDetailClient";
import { requireSession } from "@/lib/auth";
import { getJobMeta } from "@/lib/job-utils";
import { getRolePrefix } from "@/lib/permissions";
import {
  canUserViewJob,
  getJob,
} from "@/lib/services/jobs";
import type { UserRole } from "@/types";
import { notFound } from "next/navigation";

export async function JobDetailPageContent({
  role,
  jobId,
  companiesBasePath,
}: {
  role: UserRole;
  jobId: string;
  companiesBasePath?: string;
}) {
  const session = await requireSession();
  const job = await getJob(jobId);
  if (!job) notFound();

  if (!canUserViewJob({ userId: session.id, role: session.role }, job)) {
    notFound();
  }

  const basePath = `${getRolePrefix(role)}/jobs`;
  const meta = getJobMeta(job);
  const relatedLinks: { label: string; href: string }[] = [];

  if (meta?.requirementId && meta?.companyId && companiesBasePath) {
    relatedLinks.push({
      label: "View requirement",
      href: `${companiesBasePath}/${meta.companyId}/requirements/${meta.requirementId}`,
    });
  }
  if (meta?.branch || meta?.batch) {
    relatedLinks.push({
      label: "View readiness",
      href: `${getRolePrefix(role)}/readiness`,
    });
  }

  return (
    <JobDetailClient
      job={job}
      basePath={basePath}
      relatedLinks={relatedLinks}
    />
  );
}
