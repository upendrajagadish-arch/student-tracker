"use client";

import {
  DriveModeBadge,
  DriveStatusBadge,
} from "@/components/placement-drives/PlacementStageBadges";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { DRIVE_STATUS_OPTIONS } from "@/lib/placement-constants";
import { formatDate } from "@/lib/utils";
import type { PaginatedResult } from "@/types";
import type { PlacementDriveListItem } from "@/types/placement-drive";
import { CalendarDays, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface PlacementDrivesPageClientProps {
  result: PaginatedResult<PlacementDriveListItem>;
  basePath: string;
  canManage: boolean;
}

export function PlacementDrivesPageClient({
  result,
  basePath,
  canManage,
}: PlacementDrivesPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function applyFilters(status?: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim()) params.set("search", search.trim());
    else params.delete("search");
    if (status !== undefined) {
      if (status) params.set("status", status);
      else params.delete("status");
    }
    params.delete("page");
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Placement Drives"
        description="Track campus drives from registration through final placement outcome."
        actions={
          canManage ? (
            <Link href={`${basePath}/new`}>
              <Button>
                <Plus className="h-4 w-4" />
                Create Drive
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search drives or companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="w-full rounded-lg border border-surface-border py-2 pl-10 pr-4 text-sm"
          />
        </div>
        <Select
          value={searchParams.get("status") ?? ""}
          onChange={(e) => applyFilters(e.target.value)}
          className="w-40"
        >
          <option value="">All statuses</option>
          {DRIVE_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Button variant="secondary" onClick={() => applyFilters()}>
          Search
        </Button>
      </div>

      {result.data.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No placement drives"
          description={
            canManage
              ? "Create a drive to track student outcomes for a company visit or hiring event."
              : "No drives have been scheduled yet."
          }
          action={
            canManage ? (
              <Link href={`${basePath}/new`}>
                <Button>Create Drive</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {result.data.map((drive) => (
            <Link key={drive.id} href={`${basePath}/${drive.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 line-clamp-2">
                      {drive.driveTitle}
                    </h3>
                    <DriveStatusBadge status={drive.status} />
                  </div>
                  <p className="text-sm text-slate-600">{drive.companyName}</p>
                  {drive.roleTitle && (
                    <p className="text-xs text-slate-500">{drive.roleTitle}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <DriveModeBadge mode={drive.mode} />
                    {drive.driveDate && (
                      <span>{formatDate(drive.driveDate)}</span>
                    )}
                  </div>
                  <div className="flex gap-4 border-t border-surface-border pt-3 text-sm">
                    <span>
                      <strong className="text-slate-900">{drive.studentCount}</strong>{" "}
                      in pipeline
                    </span>
                    <span>
                      <strong className="text-brand-700">{drive.joinedCount}</strong>{" "}
                      joined
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {result.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              variant={p === result.page ? "primary" : "secondary"}
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(p));
                router.push(`${basePath}?${params.toString()}`);
              }}
            >
              {p}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
