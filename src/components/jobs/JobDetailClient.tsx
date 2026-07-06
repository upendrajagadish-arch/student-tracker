"use client";

import { JobStatusBadge } from "@/components/jobs/JobStatusBadge";
import { Button } from "@/components/ui/Button";
import { JOB_TYPE_LABELS } from "@/lib/job-constants";
import { formatJobDuration, getJobResultSummary } from "@/lib/job-utils";
import { getJobMeta } from "@/lib/job-utils";
import { formatDate } from "@/lib/utils";
import type { JobItem } from "@/types/jobs";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface JobDetailClientProps {
  job: JobItem;
  basePath: string;
  relatedLinks?: { label: string; href: string }[];
}

export function JobDetailClient({
  job,
  basePath,
  relatedLinks = [],
}: JobDetailClientProps) {
  const router = useRouter();
  const meta = getJobMeta(job);
  const result = job.resultJson;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{job.title}</h1>
            <JobStatusBadge status={job.status} />
          </div>
          {job.description && (
            <p className="mt-2 text-sm text-slate-600">{job.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={basePath}>
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Back to jobs
            </Button>
          </Link>
          <Button variant="secondary" onClick={() => router.refresh()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-surface-border bg-white p-5 shadow-card lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Progress</h2>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-sm text-slate-600">
              <span>
                {job.progressTotal > 0
                  ? `${job.progressCurrent.toLocaleString()} / ${job.progressTotal.toLocaleString()}`
                  : "No progress units"}
              </span>
              <span>{job.progressPercent}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${
                  job.status === "FAILED"
                    ? "bg-red-500"
                    : job.status === "COMPLETED"
                      ? "bg-emerald-500"
                      : "bg-blue-500"
                }`}
                style={{ width: `${job.progressPercent}%` }}
              />
            </div>
          </div>

          {job.status === "FAILED" && job.errorMessage && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="mt-1 text-sm text-red-700">{job.errorMessage}</p>
              <p className="mt-2 text-xs text-red-600">
                Fix the underlying issue and retry the operation from the source page.
              </p>
            </div>
          )}

          {job.status === "COMPLETED" && result && (
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Result summary</p>
              <p>{getJobResultSummary(job)}</p>
              {"durationMs" in result && (
                <p className="text-slate-500">
                  Duration: {formatJobDuration(result.durationMs)}
                </p>
              )}
              {job.jobType === "BULK_READINESS_RECALC" && (
                <ul className="list-inside list-disc text-slate-600">
                  <li>Total students: {String(result.totalStudents ?? "—")}</li>
                  <li>Recalculated: {String(result.recalculatedCount ?? "—")}</li>
                  <li>Failed: {String(result.failedCount ?? "—")}</li>
                </ul>
              )}
              {job.jobType === "COMPANY_MATCHING" && (
                <ul className="list-inside list-disc text-slate-600">
                  <li>Students checked: {String(result.studentsChecked ?? "—")}</li>
                  <li>Strong fit: {String(result.strongFit ?? "—")}</li>
                  <li>Good fit: {String(result.goodFit ?? "—")}</li>
                  <li>Average: {String(result.averageFit ?? "—")}</li>
                  <li>Risk: {String(result.riskFit ?? "—")}</li>
                  <li>Not fit: {String(result.notFit ?? "—")}</li>
                </ul>
              )}
              {job.jobType === "STUDENT_IMPORT" && (
                <ul className="list-inside list-disc text-slate-600">
                  <li>Created: {String(result.importedCount ?? "—")}</li>
                  <li>Updated: {String(result.updatedCount ?? "—")}</li>
                  <li>Skipped: {String(result.skippedCount ?? "—")}</li>
                  <li>Invalid: {String(result.invalidCount ?? "—")}</li>
                  <li>Duplicates: {String(result.duplicateCount ?? "—")}</li>
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-surface-border bg-white p-5 shadow-card">
            <h2 className="text-sm font-semibold text-slate-900">Details</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">Type</dt>
                <dd className="font-medium text-slate-900">
                  {JOB_TYPE_LABELS[job.jobType]}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Created by</dt>
                <dd className="font-medium text-slate-900">
                  {job.createdByName ?? job.createdByEmail ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd>{formatDate(job.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Started</dt>
                <dd>{job.startedAt ? formatDate(job.startedAt) : "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Completed</dt>
                <dd>{job.completedAt ? formatDate(job.completedAt) : "—"}</dd>
              </div>
              {job.failedAt && (
                <div>
                  <dt className="text-slate-500">Failed</dt>
                  <dd>{formatDate(job.failedAt)}</dd>
                </div>
              )}
            </dl>
          </div>

          {(relatedLinks.length > 0 || meta) && (
            <div className="rounded-xl border border-surface-border bg-white p-5 shadow-card">
              <h2 className="text-sm font-semibold text-slate-900">Related</h2>
              <ul className="mt-3 space-y-2">
                {relatedLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-brand-600 hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
