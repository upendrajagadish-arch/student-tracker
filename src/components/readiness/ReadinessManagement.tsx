"use client";

import {
  ReadinessStatusBadge,
  RiskBadge,
} from "@/components/readiness/ReadinessBadges";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import {
  READINESS_STATUS_OPTIONS,
  RISK_LEVEL_OPTIONS,
} from "@/lib/readiness-constants";
import { formatDate, formatScore } from "@/lib/utils";
import type { ReadinessOverviewItem } from "@/types/readiness";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useRef, useState, useTransition } from "react";
import { JobProgressPanel } from "@/components/jobs/JobProgressPanel";

interface ReadinessFilterBarProps {
  branches: string[];
  batches: string[];
  basePath: string;
  jobsBasePath: string;
  canRecalculate: boolean;
}

export function ReadinessFilterBar({
  branches,
  batches,
  basePath,
  jobsBasePath,
  canRecalculate,
}: ReadinessFilterBarProps) {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isBulkRecalc, setIsBulkRecalc] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = searchParams.get("search") ?? "";
  const branch = searchParams.get("branch") ?? "";
  const batch = searchParams.get("batch") ?? "";
  const riskLevel = searchParams.get("riskLevel") ?? "";
  const readinessStatus = searchParams.get("readinessStatus") ?? "";
  const minScore = searchParams.get("minScore") ?? "";
  const maxScore = searchParams.get("maxScore") ?? "";

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
    search ||
    branch ||
    batch ||
    riskLevel ||
    readinessStatus ||
    minScore ||
    maxScore;

  async function handleBulkRecalculate() {
    setIsBulkRecalc(true);
    try {
      const res = await fetch("/api/readiness/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch: branch || undefined, batch: batch || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error?.message ?? data.error ?? "Bulk recalculation failed", "error");
        return;
      }
      if (data.jobId) {
        setActiveJobId(data.jobId);
        toast(data.message ?? "Bulk readiness job started", "success");
      } else {
        toast(`Recalculated readiness for ${data.count} students`, "success");
        router.refresh();
      }
    } catch {
      toast("Bulk recalculation failed", "error");
    } finally {
      setIsBulkRecalc(false);
    }
  }

  return (
    <>
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
          value={riskLevel}
          onChange={(e) => updateParams({ riskLevel: e.target.value })}
        >
          <option value="">All risk levels</option>
          {RISK_LEVEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
        <Select
          value={readinessStatus}
          onChange={(e) => updateParams({ readinessStatus: e.target.value })}
        >
          <option value="">All readiness statuses</option>
          {READINESS_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
        <Input
          type="number"
          placeholder="Min score"
          min={0}
          max={100}
          defaultValue={minScore}
          onChange={(e) => updateParams({ minScore: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Max score"
          min={0}
          max={100}
          defaultValue={maxScore}
          onChange={(e) => updateParams({ maxScore: e.target.value })}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {hasFilters ? (
          <button
            onClick={() => startTransition(() => router.push(basePath))}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
            Clear filters
          </button>
        ) : (
          <span />
        )}
        {canRecalculate && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleBulkRecalculate}
            isLoading={isBulkRecalc}
          >
            <RefreshCw className="h-4 w-4" />
            Recalculate All
          </Button>
        )}
      </div>
    </div>
    {activeJobId && (
      <JobProgressPanel
        jobId={activeJobId}
        jobsBasePath={jobsBasePath}
        title="Bulk readiness recalculation"
        className="mt-4"
        onComplete={(job) => {
          if (job.status === "COMPLETED") {
            toast("Bulk readiness recalculation completed", "success");
          } else if (job.status === "FAILED") {
            toast(job.errorMessage ?? "Bulk recalculation failed", "error");
          }
        }}
      />
    )}
    </>
  );
}

export function ReadinessFilterBarSuspense(props: ReadinessFilterBarProps) {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-slate-100" />}>
      <ReadinessFilterBar {...props} />
    </Suspense>
  );
}

interface ReadinessTableProps {
  rows: ReadinessOverviewItem[];
  studentsBasePath: string;
  basePath: string;
  page: number;
  totalPages: number;
  canRecalculate: boolean;
}

export function ReadinessTable({
  rows,
  studentsBasePath,
  basePath,
  page,
  totalPages,
  canRecalculate,
}: ReadinessTableProps) {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const router = useRouter();
  const [recalcId, setRecalcId] = useState<string | null>(null);

  function pageUrl(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    return `${basePath}?${params.toString()}`;
  }

  async function handleRecalculate(studentId: string) {
    setRecalcId(studentId);
    try {
      const res = await fetch(
        `/api/students/${studentId}/readiness/recalculate`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json();
        toast(data.error ?? "Recalculation failed", "error");
        return;
      }
      toast("Readiness recalculated", "success");
      router.refresh();
    } catch {
      toast("Recalculation failed", "error");
    } finally {
      setRecalcId(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-surface-border bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-slate-50/80">
              <th className="px-4 py-3 font-medium text-slate-600">Student</th>
              <th className="px-4 py-3 font-medium text-slate-600">Roll No.</th>
              <th className="px-4 py-3 font-medium text-slate-600">Branch</th>
              <th className="px-4 py-3 font-medium text-slate-600">Batch</th>
              <th className="px-4 py-3 font-medium text-slate-600">Overall</th>
              <th className="px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 font-medium text-slate-600">Risk</th>
              <th className="px-4 py-3 font-medium text-slate-600">Technical</th>
              <th className="px-4 py-3 font-medium text-slate-600">Comm.</th>
              <th className="px-4 py-3 font-medium text-slate-600">Resume</th>
              <th className="px-4 py-3 font-medium text-slate-600">Tech Stack</th>
              <th className="px-4 py-3 font-medium text-slate-600">Next Action</th>
              <th className="px-4 py-3 font-medium text-slate-600">Calculated</th>
              <th className="px-4 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {rows.map((row) => (
              <tr key={row.studentId} className="hover:bg-slate-50/50">
                <td className="px-4 py-3.5 font-medium text-slate-900">
                  {row.fullName}
                </td>
                <td className="px-4 py-3.5 text-slate-600">{row.rollNumber}</td>
                <td className="px-4 py-3.5 text-slate-600">{row.branch}</td>
                <td className="px-4 py-3.5 text-slate-600">{row.batch}</td>
                <td className="px-4 py-3.5 font-semibold text-slate-900">
                  {row.snapshotId ? formatScore(row.overallScore) : "—"}
                </td>
                <td className="px-4 py-3.5">
                  {row.snapshotId ? (
                    <ReadinessStatusBadge status={row.readinessStatus} />
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  {row.snapshotId ? (
                    <RiskBadge level={row.riskLevel} />
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-slate-600">
                  {row.snapshotId ? formatScore(row.technicalReadiness) : "—"}
                </td>
                <td className="px-4 py-3.5 text-slate-600">
                  {row.snapshotId ? formatScore(row.communicationReadiness) : "—"}
                </td>
                <td className="px-4 py-3.5 text-slate-600">
                  {row.snapshotId ? formatScore(row.resumeReadiness) : "—"}
                </td>
                <td className="px-4 py-3.5 text-slate-600">
                  {row.snapshotId ? formatScore(row.techStackReadiness) : "—"}
                </td>
                <td className="max-w-[200px] truncate px-4 py-3.5 text-slate-600">
                  {row.nextRecommendedAction}
                </td>
                <td className="px-4 py-3.5 text-slate-600">
                  {row.calculatedAt ? formatDate(row.calculatedAt) : "—"}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex gap-1">
                    <Link href={`${studentsBasePath}/${row.studentId}`}>
                      <Button size="sm" variant="secondary">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    {canRecalculate && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRecalculate(row.studentId)}
                        isLoading={recalcId === row.studentId}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
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
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageUrl(page - 1)}>
                <Button size="sm" variant="secondary">
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={pageUrl(page + 1)}>
                <Button size="sm" variant="secondary">
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
