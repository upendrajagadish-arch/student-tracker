"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { GITHUB_SYNC_STATUS_OPTIONS } from "@/lib/github-constants";
import { formatDate, formatScore } from "@/lib/utils";
import type { GitHubOverviewItem, GitHubOverviewResult } from "@/types/github";
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

interface GitHubPageClientProps {
  result: GitHubOverviewResult;
  branches: string[];
  batches: string[];
  basePath: string;
  jobsBasePath: string;
  studentsBasePath: string;
  canSync: boolean;
}

export function GitHubPageClient({
  result,
  branches,
  batches,
  basePath,
  jobsBasePath,
  studentsBasePath,
  canSync,
}: GitHubPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = searchParams.get("search") ?? "";
  const branch = searchParams.get("branch") ?? "";
  const batch = searchParams.get("batch") ?? "";
  const syncStatus = searchParams.get("syncStatus") ?? "";
  const language = searchParams.get("language") ?? "";
  const minEvidenceScore = searchParams.get("minEvidenceScore") ?? "";
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

  const hasFilters =
    search || branch || batch || syncStatus || language || minEvidenceScore;

  async function handleBulkSync(studentIds?: string[]) {
    setIsBulkSyncing(true);
    try {
      const res = await fetch("/api/github/bulk-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: studentIds && studentIds.length > 0 ? studentIds : undefined,
          branch: branch || undefined,
          batch: batch || undefined,
          syncStatus: syncStatus || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error?.message ?? data.error ?? "Bulk sync failed", "error");
        return;
      }
      if (data.jobId) {
        setActiveJobId(data.jobId);
        setSelected(new Set());
        toast(data.message ?? "Bulk GitHub sync started", "success");
      }
    } catch {
      toast("Bulk sync failed", "error");
    } finally {
      setIsBulkSyncing(false);
    }
  }

  async function handleSyncOne(studentId: string) {
    setSyncingId(studentId);
    try {
      const res = await fetch(`/api/students/${studentId}/github/sync`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Sync failed", "error");
        return;
      }
      toast(
        data.success ? "GitHub synced" : data.error ?? "Sync failed",
        data.success ? "success" : "error"
      );
      router.refresh();
    } catch {
      toast("Sync failed", "error");
    } finally {
      setSyncingId(null);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
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
                  400
                );
              }}
            />
          </div>
          <Select
            value={branch}
            onChange={(e) => updateParams({ branch: e.target.value })}
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
          >
            <option value="">All batches</option>
            {batches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
          <Select
            value={syncStatus}
            onChange={(e) => updateParams({ syncStatus: e.target.value })}
          >
            <option value="">All sync statuses</option>
            {GITHUB_SYNC_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Filter by language"
            defaultValue={language}
            onChange={(e) => {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(
                () => updateParams({ language: e.target.value }),
                400
              );
            }}
          />
          <Input
            type="number"
            min={0}
            max={100}
            placeholder="Min evidence score"
            defaultValue={minEvidenceScore}
            onChange={(e) => {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(
                () => updateParams({ minEvidenceScore: e.target.value }),
                400
              );
            }}
          />
          {hasFilters && (
            <Button
              variant="secondary"
              onClick={() => startTransition(() => router.push(basePath))}
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
        {canSync && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() => handleBulkSync([...selected])}
              disabled={isBulkSyncing || selected.size === 0}
            >
              <RefreshCw
                className={`h-4 w-4 ${isBulkSyncing ? "animate-spin" : ""}`}
              />
              Sync selected ({selected.size})
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleBulkSync()}
              disabled={isBulkSyncing}
            >
              Sync filtered students
            </Button>
          </div>
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

      <div className="overflow-hidden rounded-xl border border-surface-border bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {canSync && <th className="px-4 py-3 w-10" />}
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">GitHub</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Evidence</th>
                <th className="px-4 py-3">Languages</th>
                <th className="px-4 py-3">Last sync</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={canSync ? 8 : 7}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No students match the current filters.
                  </td>
                </tr>
              ) : (
                result.items.map((item) => (
                  <GitHubRow
                    key={item.studentId}
                    item={item}
                    canSync={canSync}
                    selected={selected.has(item.studentId)}
                    onToggle={() => toggleSelect(item.studentId)}
                    onSync={() => handleSyncOne(item.studentId)}
                    isSyncing={syncingId === item.studentId}
                    studentsBasePath={studentsBasePath}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        {result.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-surface-border px-4 py-3">
            <p className="text-xs text-slate-500">
              Page {result.page} of {result.totalPages} · {result.total} students
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                disabled={page >= result.totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GitHubRow({
  item,
  canSync,
  selected,
  onToggle,
  onSync,
  isSyncing,
  studentsBasePath,
}: {
  item: GitHubOverviewItem;
  canSync: boolean;
  selected: boolean;
  onToggle: () => void;
  onSync: () => void;
  isSyncing: boolean;
  studentsBasePath: string;
}) {
  return (
    <tr className="border-b border-surface-border last:border-0 hover:bg-slate-50/50">
      {canSync && (
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="rounded border-slate-300"
          />
        </td>
      )}
      <td className="px-4 py-3">
        <div className="font-medium text-slate-900">{item.fullName}</div>
        <div className="text-xs text-slate-500">
          {item.rollNumber} · {item.branch}
        </div>
      </td>
      <td className="px-4 py-3">
        {item.username ? (
          <span className="text-brand-600">@{item.username}</span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs">{item.syncStatus.replace("_", " ")}</td>
      <td className="px-4 py-3 font-medium">
        {item.evidenceScore > 0 ? formatScore(item.evidenceScore) : "—"}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {item.topLanguages.slice(0, 3).map((l) => (
            <span
              key={l.name}
              className="rounded bg-slate-100 px-2 py-0.5 text-xs"
            >
              {l.name}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {item.lastSyncedAt ? formatDate(item.lastSyncedAt) : "—"}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <Link href={`${studentsBasePath}/${item.studentId}`}>
            <Button variant="secondary" className="h-8 px-2">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          {canSync && (
            <Button
              variant="secondary"
              className="h-8 px-2"
              onClick={onSync}
              disabled={isSyncing}
            >
              <RefreshCw
                className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
              />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function GitHubPageClientShell(props: GitHubPageClientProps) {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
      <GitHubPageClient {...props} />
    </Suspense>
  );
}
