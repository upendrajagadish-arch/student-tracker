"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import {
  CODING_DATA_SOURCE_LABELS,
  CODING_DATA_SOURCE_OPTIONS,
  CODING_VERIFICATION_OPTIONS,
  CODING_VERIFICATION_STATUS_LABELS,
} from "@/lib/coding-platform-constants";
import { formatDate, formatScore } from "@/lib/utils";
import type {
  CodingPlatformItem,
  CodingProfileOverviewItem,
  CodingProfileOverviewResult,
  ParsedCodingImportRow,
} from "@/types/coding-platforms";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useRef, useState, useTransition } from "react";

interface CodingPlatformsPageClientProps {
  result: CodingProfileOverviewResult;
  platforms: CodingPlatformItem[];
  branches: string[];
  batches: string[];
  basePath: string;
  studentsBasePath: string;
  canImport: boolean;
}

export function CodingPlatformsPageClientShell(
  props: CodingPlatformsPageClientProps
) {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
      <CodingPlatformsPageClient {...props} />
    </Suspense>
  );
}

function CodingPlatformsPageClient({
  result,
  platforms,
  branches,
  batches,
  basePath,
  studentsBasePath,
  canImport,
}: CodingPlatformsPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ParsedCodingImportRow[] | null>(
    null
  );
  const [updateMode, setUpdateMode] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const search = searchParams.get("search") ?? "";
  const branch = searchParams.get("branch") ?? "";
  const batch = searchParams.get("batch") ?? "";
  const platformId = searchParams.get("platformId") ?? "";
  const verificationStatus = searchParams.get("verificationStatus") ?? "";
  const dataSource = searchParams.get("dataSource") ?? "";
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
    search ||
    branch ||
    batch ||
    platformId ||
    verificationStatus ||
    dataSource ||
    minEvidenceScore;

  async function handleImportPreview(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("updateMode", String(updateMode));
    const res = await fetch("/api/coding-profiles/import/preview", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error?.message ?? data.error ?? "Preview failed", "error");
      return;
    }
    setImportRows(data.rows);
    setImportOpen(true);
  }

  async function handleImportConfirm() {
    if (!importRows) return;
    setIsImporting(true);
    try {
      const res = await fetch("/api/coding-profiles/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: importRows, updateMode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error?.message ?? data.error ?? "Import failed", "error");
        return;
      }
      toast(data.message ?? "Import completed", "success");
      setImportOpen(false);
      setImportRows(null);
      router.refresh();
    } catch {
      toast("Import failed", "error");
    } finally {
      setIsImporting(false);
    }
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
            value={platformId}
            onChange={(e) => updateParams({ platformId: e.target.value })}
          >
            <option value="">All platforms</option>
            {platforms.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          <Select
            value={verificationStatus}
            onChange={(e) => updateParams({ verificationStatus: e.target.value })}
          >
            <option value="">All verification</option>
            {CODING_VERIFICATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <Select
            value={dataSource}
            onChange={(e) => updateParams({ dataSource: e.target.value })}
          >
            <option value="">All sources</option>
            {CODING_DATA_SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
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
            <Button variant="secondary" onClick={() => startTransition(() => router.push(basePath))}>
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
        {canImport && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-surface-border bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              <Upload className="h-4 w-4" />
              Upload CSV/Excel
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportPreview(file);
                  e.target.value = "";
                }}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={updateMode}
                onChange={(e) => setUpdateMode(e.target.checked)}
              />
              Update existing profiles
            </label>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-surface-border bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">Solved</th>
                <th className="px-4 py-3">Evidence</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Last Activity</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    No coding profiles match the current filters.
                  </td>
                </tr>
              ) : (
                result.items.map((item) => (
                  <OverviewRow
                    key={item.profileId}
                    item={item}
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
              Page {result.page} of {result.totalPages} · {result.total} profiles
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

      {importOpen && importRows && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl">
            <div className="border-b border-surface-border p-4">
              <h3 className="text-lg font-semibold">Import Preview</h3>
              <p className="text-sm text-slate-500">
                {importRows.filter((r) => r.status === "valid").length} valid ·{" "}
                {importRows.filter((r) => r.status === "update").length} updates ·{" "}
                {importRows.filter((r) => r.status === "invalid").length} invalid ·{" "}
                {importRows.filter((r) => r.status === "unknown_student").length} unknown students
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {importRows.slice(0, 50).map((row) => (
                  <div
                    key={row.rowNumber}
                    className="rounded border border-surface-border p-2 text-xs"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">Row {row.rowNumber}</span>
                      <span className="uppercase text-slate-500">{row.status}</span>
                    </div>
                    <p className="text-slate-600">
                      {row.data?.rollNumber || row.data?.email} · {row.data?.platform}
                    </p>
                    {row.errors.length > 0 && (
                      <p className="text-red-600">{row.errors.join("; ")}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-surface-border p-4">
              <Button variant="secondary" onClick={() => setImportOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleImportConfirm} disabled={isImporting}>
                {isImporting ? "Importing…" : "Confirm Import"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewRow({
  item,
  studentsBasePath,
}: {
  item: CodingProfileOverviewItem;
  studentsBasePath: string;
}) {
  return (
    <tr className="border-b border-surface-border last:border-0 hover:bg-slate-50/50">
      <td className="px-4 py-3">
        <div className="font-medium text-slate-900">{item.fullName}</div>
        <div className="text-xs text-slate-500">
          {item.rollNumber} · {item.branch}
        </div>
      </td>
      <td className="px-4 py-3">{item.platformName}</td>
      <td className="px-4 py-3">{item.totalProblemsSolved}</td>
      <td className="px-4 py-3 font-medium">
        {formatScore(item.evidenceScore)}
      </td>
      <td className="px-4 py-3 text-xs">
        {CODING_VERIFICATION_STATUS_LABELS[item.verificationStatus]}
      </td>
      <td className="px-4 py-3 text-xs">
        {CODING_DATA_SOURCE_LABELS[item.dataSource]}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {item.lastActivityAt ? formatDate(item.lastActivityAt) : "—"}
      </td>
      <td className="px-4 py-3 text-right">
        <Link href={`${studentsBasePath}/${item.studentId}`}>
          <Button variant="secondary" className="h-8 px-2">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      </td>
    </tr>
  );
}
