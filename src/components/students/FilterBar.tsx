"use client";

import { PLACEMENT_STATUS_OPTIONS } from "@/lib/constants";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useTransition } from "react";

interface FilterBarProps {
  branches: string[];
  batches: string[];
  basePath: string;
}

export function FilterBar({ branches, batches, basePath }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = searchParams.get("search") ?? "";
  const branch = searchParams.get("branch") ?? "";
  const batch = searchParams.get("batch") ?? "";
  const placementStatus = searchParams.get("placementStatus") ?? "";

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      params.delete("page");
      startTransition(() => {
        router.push(`${basePath}?${params.toString()}`);
      });
    },
    [basePath, router, searchParams]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const hasFilters = search || branch || batch || placementStatus;

  return (
    <div
      className={`rounded-xl border border-surface-border bg-white p-4 shadow-card ${isPending ? "opacity-70" : ""}`}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2 lg:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name, roll no, email..."
            className="pl-9"
            defaultValue={search}
            onChange={(e) => {
              const value = e.target.value;
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(
                () => updateParams({ search: value }),
                300
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
          value={placementStatus}
          onChange={(e) => updateParams({ placementStatus: e.target.value })}
        >
          <option value="">All statuses</option>
          {PLACEMENT_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
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
