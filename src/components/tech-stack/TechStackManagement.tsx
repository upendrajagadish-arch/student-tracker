"use client";

import { SkillBadge } from "@/components/tech-stack/TechStackBadges";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  DEFAULT_ROLE_INTERESTS,
  PROFICIENCY_OPTIONS,
  SKILL_CATEGORY_OPTIONS,
  VERIFICATION_OPTIONS,
} from "@/lib/tech-constants";
import { formatDate } from "@/lib/utils";
import type { StudentTechStackSummary, TechSkillItem } from "@/types/tech-stack";
import { ChevronLeft, ChevronRight, Eye, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useRef, useTransition } from "react";

interface TechStackFilterBarProps {
  branches: string[];
  batches: string[];
  masterSkills: TechSkillItem[];
  basePath: string;
}

export function TechStackFilterBar({
  branches,
  batches,
  masterSkills,
  basePath,
}: TechStackFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = searchParams.get("search") ?? "";
  const branch = searchParams.get("branch") ?? "";
  const batch = searchParams.get("batch") ?? "";
  const techSkillId = searchParams.get("techSkillId") ?? "";
  const category = searchParams.get("category") ?? "";
  const proficiencyLevel = searchParams.get("proficiencyLevel") ?? "";
  const verificationStatus = searchParams.get("verificationStatus") ?? "";
  const roleInterest = searchParams.get("roleInterest") ?? "";

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
    techSkillId ||
    category ||
    proficiencyLevel ||
    verificationStatus ||
    roleInterest;

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
          value={techSkillId}
          onChange={(e) => updateParams({ techSkillId: e.target.value })}
        >
          <option value="">All skills</option>
          {masterSkills.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
        <Select
          value={category}
          onChange={(e) => updateParams({ category: e.target.value })}
        >
          <option value="">All categories</option>
          {SKILL_CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
        <Select
          value={proficiencyLevel}
          onChange={(e) => updateParams({ proficiencyLevel: e.target.value })}
        >
          <option value="">All proficiency</option>
          {PROFICIENCY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
        <Select
          value={verificationStatus}
          onChange={(e) => updateParams({ verificationStatus: e.target.value })}
        >
          <option value="">All verification</option>
          {VERIFICATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
        <Select
          value={roleInterest}
          onChange={(e) => updateParams({ roleInterest: e.target.value })}
        >
          <option value="">All role interests</option>
          {DEFAULT_ROLE_INTERESTS.map((r) => (
            <option key={r} value={r}>{r}</option>
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

export function TechStackFilterBarSuspense(props: TechStackFilterBarProps) {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-slate-100" />}>
      <TechStackFilterBar {...props} />
    </Suspense>
  );
}

interface TechStackTableProps {
  rows: StudentTechStackSummary[];
  studentsBasePath: string;
  basePath: string;
  page: number;
  totalPages: number;
}

export function TechStackTable({
  rows,
  studentsBasePath,
  basePath,
  page,
  totalPages,
}: TechStackTableProps) {
  const searchParams = useSearchParams();

  function pageUrl(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-surface-border bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-slate-50/80">
              <th className="px-4 py-3 font-medium text-slate-600">Student</th>
              <th className="px-4 py-3 font-medium text-slate-600">Roll Number</th>
              <th className="px-4 py-3 font-medium text-slate-600">Branch</th>
              <th className="px-4 py-3 font-medium text-slate-600">Batch</th>
              <th className="px-4 py-3 font-medium text-slate-600">Skills</th>
              <th className="px-4 py-3 font-medium text-slate-600">Top Skills</th>
              <th className="px-4 py-3 font-medium text-slate-600">Verified</th>
              <th className="px-4 py-3 font-medium text-slate-600">Role Interests</th>
              <th className="px-4 py-3 font-medium text-slate-600">Last Updated</th>
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
                <td className="px-4 py-3.5 text-slate-600">{row.skillsCount}</td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {row.topSkills.length > 0 ? (
                      row.topSkills.map((s) => <SkillBadge key={s} name={s} />)
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-slate-600">
                  {row.verifiedSkillsCount}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {row.roleInterests.length > 0 ? (
                      row.roleInterests.slice(0, 2).map((r) => (
                        <span
                          key={r}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                        >
                          {r}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                    {row.roleInterests.length > 2 && (
                      <span className="text-xs text-slate-400">
                        +{row.roleInterests.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-slate-600">
                  {row.lastUpdated ? formatDate(row.lastUpdated) : "—"}
                </td>
                <td className="px-4 py-3.5">
                  <Link href={`${studentsBasePath}/${row.studentId}`}>
                    <Button size="sm" variant="secondary">
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Button>
                  </Link>
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
