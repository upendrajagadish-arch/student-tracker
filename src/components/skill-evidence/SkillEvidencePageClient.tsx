"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { JobProgressPanel } from "@/components/jobs/JobProgressPanel";
import { EVIDENCE_STRENGTH_OPTIONS } from "@/lib/skill-evidence-constants";
import { formatDate } from "@/lib/utils";
import type { SkillEvidenceOverviewResult } from "@/types/skill-evidence";
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

interface SkillEvidencePageClientProps {
  result: SkillEvidenceOverviewResult;
  branches: string[];
  batches: string[];
  basePath: string;
  jobsBasePath: string;
  studentsBasePath: string;
  canRefresh: boolean;
}

export function SkillEvidencePageClientShell(
  props: SkillEvidencePageClientProps
) {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
      <SkillEvidencePageClient {...props} />
    </Suspense>
  );
}

function SkillEvidencePageClient({
  result,
  branches,
  batches,
  basePath,
  jobsBasePath,
  studentsBasePath,
  canRefresh,
}: SkillEvidencePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isBulkRefreshing, setIsBulkRefreshing] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = searchParams.get("search") ?? "";
  const branch = searchParams.get("branch") ?? "";
  const batch = searchParams.get("batch") ?? "";
  const evidenceStrength = searchParams.get("evidenceStrength") ?? "";
  const page = Number(searchParams.get("page")) || 1;

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      if (!("page" in updates)) params.delete("page");
      startTransition(() => router.push(`${basePath}?${params.toString()}`));
    },
    [basePath, router, searchParams]
  );

  const hasFilters = search || branch || batch || evidenceStrength;

  async function handleBulkRefresh() {
    setIsBulkRefreshing(true);
    try {
      const res = await fetch("/api/skill-evidence/bulk-refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch: branch || undefined,
          batch: batch || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error?.message ?? data.error ?? "Bulk refresh failed", "error");
        return;
      }
      if (data.jobId) {
        setActiveJobId(data.jobId);
        toast("Bulk skill evidence refresh started", "success");
      }
    } catch {
      toast("Bulk refresh failed", "error");
    } finally {
      setIsBulkRefreshing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            defaultValue={search}
            placeholder="Search students…"
            className="pl-9"
            onChange={(e) => {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(
                () => updateParams({ search: e.target.value }),
                300
              );
            }}
          />
        </div>
        <Select
          value={branch}
          onChange={(e) => updateParams({ branch: e.target.value })}
          className="w-36"
        >
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
        <Select
          value={batch}
          onChange={(e) => updateParams({ batch: e.target.value })}
          className="w-32"
        >
          <option value="">All batches</option>
          {batches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
        <Select
          value={evidenceStrength}
          onChange={(e) => updateParams({ evidenceStrength: e.target.value })}
          className="w-40"
        >
          <option value="">All strengths</option>
          {EVIDENCE_STRENGTH_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => router.push(basePath)}>
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
        {canRefresh && (
          <Button
            variant="secondary"
            onClick={handleBulkRefresh}
            disabled={isBulkRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${isBulkRefreshing ? "animate-spin" : ""}`}
            />
            Bulk Refresh
          </Button>
        )}
      </div>

      {activeJobId && (
        <JobProgressPanel
          jobId={activeJobId}
          jobsBasePath={jobsBasePath}
          onComplete={() => {
            setActiveJobId(null);
            router.refresh();
          }}
        />
      )}

      <div
        className={`overflow-hidden rounded-xl border border-surface-border bg-white shadow-card ${
          isPending ? "opacity-60" : ""
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-slate-50/80">
                <th className="px-4 py-3 font-medium text-slate-600">Student</th>
                <th className="px-4 py-3 font-medium text-slate-600">Branch</th>
                <th className="px-4 py-3 font-medium text-slate-600">Skills</th>
                <th className="px-4 py-3 font-medium text-slate-600">Verified</th>
                <th className="px-4 py-3 font-medium text-slate-600">Strong</th>
                <th className="px-4 py-3 font-medium text-slate-600">Weak</th>
                <th className="px-4 py-3 font-medium text-slate-600">Last Refresh</th>
                <th className="px-4 py-3 font-medium text-slate-600" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {result.items.map((row) => (
                <tr
                  key={row.studentId}
                  className="transition-colors hover:bg-slate-50/60"
                >
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{row.fullName}</p>
                  <p className="text-xs text-slate-500">{row.rollNumber}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {row.branch} · {row.batch}
                </td>
                <td className="px-4 py-3">{row.totalSkills}</td>
                <td className="px-4 py-3">{row.verifiedCount}</td>
                <td className="px-4 py-3">{row.strongCount}</td>
                <td className="px-4 py-3">{row.weakCount}</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {row.lastRefreshedAt ? formatDate(row.lastRefreshedAt) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`${studentsBasePath}/${row.studentId}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </Link>
                </td>
              </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.items.length === 0 && (
          <p className="border-t border-surface-border p-10 text-center text-sm text-slate-500">
            No students match the current filters. Try bulk refresh after students have tech stack data.
          </p>
        )}
      </div>

      {result.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {result.page} of {result.totalPages} ({result.total} students)
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= result.totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
