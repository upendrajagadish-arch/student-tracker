"use client";

import { ResumeReviewBadge } from "@/components/ui/ResumeReviewBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { RESUME_REVIEW_STATUS_OPTIONS } from "@/lib/resume-constants";
import { formatDate, formatScore } from "@/lib/utils";
import type { ResumeListItem } from "@/types";
import { ChevronLeft, ChevronRight, Download, Eye, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useRef, useTransition } from "react";

interface ResumeFilterBarProps {
  branches: string[];
  batches: string[];
  basePath: string;
}

export function ResumeFilterBar({
  branches,
  batches,
  basePath,
}: ResumeFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = searchParams.get("search") ?? "";
  const branch = searchParams.get("branch") ?? "";
  const batch = searchParams.get("batch") ?? "";
  const reviewStatus = searchParams.get("reviewStatus") ?? "";
  const scoreMin = searchParams.get("scoreMin") ?? "";
  const scoreMax = searchParams.get("scoreMax") ?? "";
  const atsFriendly = searchParams.get("atsFriendly") ?? "";

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

  const hasFilters =
    search || branch || batch || reviewStatus || scoreMin || scoreMax || atsFriendly;

  return (
    <div
      className={`rounded-xl border border-surface-border bg-white p-4 shadow-card ${isPending ? "opacity-70" : ""}`}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search name or roll number..."
            className="pl-9"
            defaultValue={search}
            onChange={(e) => {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(
                () => updateParams({ search: e.target.value }),
                300
              );
            }}
          />
        </div>
        <Select value={branch} onChange={(e) => updateParams({ branch: e.target.value })}>
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </Select>
        <Select value={batch} onChange={(e) => updateParams({ batch: e.target.value })}>
          <option value="">All batches</option>
          {batches.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </Select>
        <Select
          value={reviewStatus}
          onChange={(e) => updateParams({ reviewStatus: e.target.value })}
        >
          <option value="">All review statuses</option>
          {RESUME_REVIEW_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
        <Input
          type="number"
          placeholder="Min score"
          min={0}
          max={100}
          defaultValue={scoreMin}
          onChange={(e) => updateParams({ scoreMin: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Max score"
          min={0}
          max={100}
          defaultValue={scoreMax}
          onChange={(e) => updateParams({ scoreMax: e.target.value })}
        />
        <Select
          value={atsFriendly}
          onChange={(e) => updateParams({ atsFriendly: e.target.value })}
        >
          <option value="">ATS friendly — all</option>
          <option value="true">ATS friendly — Yes</option>
          <option value="false">ATS friendly — No</option>
        </Select>
      </div>
      {hasFilters && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => startTransition(() => router.push(basePath))}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

interface ResumeTableProps {
  resumes: ResumeListItem[];
  studentsBasePath: string;
  page: number;
  totalPages: number;
  canDownload: boolean;
}

export function ResumeTable({
  resumes,
  studentsBasePath,
  page,
  totalPages,
  canDownload,
}: ResumeTableProps) {
  const searchParams = useSearchParams();

  function pageUrl(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    return `${studentsBasePath.replace(/\/students$/, "/resumes")}?${params.toString()}`;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-surface-border bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-slate-50/80">
              <th className="px-4 py-3 font-medium text-slate-600">Student</th>
              <th className="px-4 py-3 font-medium text-slate-600">Branch</th>
              <th className="px-4 py-3 font-medium text-slate-600">Batch</th>
              <th className="px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 font-medium text-slate-600">Score</th>
              <th className="px-4 py-3 font-medium text-slate-600">ATS</th>
              <th className="px-4 py-3 font-medium text-slate-600">Insight</th>
              <th className="px-4 py-3 font-medium text-slate-600">Uploaded</th>
              <th className="px-4 py-3 font-medium text-slate-600">Reviewed By</th>
              <th className="px-4 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {resumes.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3.5">
                  <p className="font-medium text-slate-900">{r.studentName}</p>
                  <p className="text-xs text-slate-500">{r.rollNumber}</p>
                </td>
                <td className="px-4 py-3.5 text-slate-600">{r.branch}</td>
                <td className="px-4 py-3.5 text-slate-600">{r.batch}</td>
                <td className="px-4 py-3.5">
                  <ResumeReviewBadge status={r.reviewStatus} />
                </td>
                <td className="px-4 py-3.5 text-slate-600">
                  {formatScore(r.resumeScore)}
                </td>
                <td className="px-4 py-3.5 text-slate-600">
                  {r.atsFriendly ? "Yes" : "No"}
                </td>
                <td className="px-4 py-3.5 text-slate-600">
                  {r.insightMeta?.hasInsight ? (
                    <div className="text-xs">
                      <span className="font-medium text-slate-800">Yes</span>
                      {r.insightMeta.suggestedResumeScore != null && (
                        <p className="text-slate-500">
                          AI score ~{Math.round(r.insightMeta.suggestedResumeScore)}
                        </p>
                      )}
                      {r.insightMeta.atsIssuesCount > 0 && (
                        <p className="text-amber-700">
                          {r.insightMeta.atsIssuesCount} ATS issue
                          {r.insightMeta.atsIssuesCount !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3.5 text-slate-600">
                  {formatDate(r.createdAt)}
                </td>
                <td className="px-4 py-3.5 text-slate-600">
                  {r.reviewedByName ?? "—"}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex gap-1">
                    <Link href={`${studentsBasePath}/${r.studentId}`}>
                      <Button variant="ghost" size="sm" aria-label="View student">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    {canDownload && (
                      <a
                        href={`/api/resumes/${r.id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm" aria-label="Download">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-surface-border px-4 py-3">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-1">
            <Link href={pageUrl(page - 1)}>
              <Button variant="secondary" size="sm" disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            </Link>
            <Link href={pageUrl(page + 1)}>
              <Button variant="secondary" size="sm" disabled={page >= totalPages}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function ResumeFilterBarSuspense(props: ResumeFilterBarProps) {
  return (
    <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-slate-200/70" />}>
      <ResumeFilterBar {...props} />
    </Suspense>
  );
}
