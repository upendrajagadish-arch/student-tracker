"use client";

import { JobStatusBadge } from "@/components/jobs/JobStatusBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PremiumTableWrapper } from "@/components/ui/premium/PremiumTableWrapper";
import { JOB_TYPE_LABELS, JOB_STATUS_OPTIONS, JOB_TYPE_OPTIONS } from "@/lib/job-constants";
import { getJobResultSummary } from "@/lib/job-utils";
import { formatDate } from "@/lib/utils";
import type { JobItem, JobType } from "@/types/jobs";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

interface JobsListClientProps {
  jobs: JobItem[];
  page: number;
  totalPages: number;
  total: number;
  basePath: string;
}

export function JobsListClient({
  jobs,
  page,
  totalPages,
  total,
  basePath,
}: JobsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const status = searchParams.get("status") ?? "";
  const jobType = searchParams.get("jobType") ?? "";
  const search = searchParams.get("search") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      params.delete("page");
      startTransition(() => router.push(`${basePath}?${params.toString()}`));
    },
    [basePath, router, searchParams]
  );

  const hasFilters = status || jobType || search || from || to;

  return (
    <div className={`space-y-4 ${isPending ? "opacity-70" : ""}`}>
      <div className="glass-panel p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search jobs…"
              className="pl-9"
              defaultValue={search}
              onChange={(e) => updateParams({ search: e.target.value })}
            />
          </div>
          <Select
            value={status}
            onChange={(e) => updateParams({ status: e.target.value })}
          >
            <option value="">All statuses</option>
            {JOB_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <Select
            value={jobType}
            onChange={(e) => updateParams({ jobType: e.target.value })}
          >
            <option value="">All types</option>
            {JOB_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <Input
            type="date"
            value={from}
            onChange={(e) => updateParams({ from: e.target.value })}
            aria-label="From date"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => updateParams({ to: e.target.value })}
            aria-label="To date"
          />
        </div>
        {hasFilters && (
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                startTransition(() => router.push(basePath))
              }
            >
              <X className="h-4 w-4" />
              Clear filters
            </Button>
          </div>
        )}
      </div>

      <p className="text-sm text-slate-500">
        Showing {jobs.length} of {total} jobs
      </p>

      <PremiumTableWrapper>
        <table className="premium-table min-w-full text-sm">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Started</th>
              <th>Created by</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No jobs found.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <Link
                      href={`${basePath}/${job.id}`}
                      className="font-medium text-brand-600 hover:underline"
                    >
                      {job.title}
                    </Link>
                  </td>
                  <td className="text-slate-600">
                    {JOB_TYPE_LABELS[job.jobType as JobType]}
                  </td>
                  <td>
                    <JobStatusBadge status={job.status} />
                  </td>
                  <td className="text-slate-600">
                    {job.progressTotal > 0
                      ? `${job.progressPercent}%`
                      : "—"}
                  </td>
                  <td className="text-slate-600">
                    {job.startedAt ? formatDate(job.startedAt) : "—"}
                  </td>
                  <td className="text-slate-600">
                    {job.createdByName ?? "—"}
                  </td>
                  <td className="max-w-xs truncate text-slate-500">
                    {getJobResultSummary(job)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </PremiumTableWrapper>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`${basePath}?${new URLSearchParams({ ...Object.fromEntries(searchParams), page: String(page - 1) })}`}>
                <Button variant="secondary" size="sm">
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={`${basePath}?${new URLSearchParams({ ...Object.fromEntries(searchParams), page: String(page + 1) })}`}>
                <Button variant="secondary" size="sm">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
