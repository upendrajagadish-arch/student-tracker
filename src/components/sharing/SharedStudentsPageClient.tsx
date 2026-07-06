"use client";

import {
  HRDecisionBadge,
  ShareStatusBadge,
} from "@/components/sharing/SharingBadges";
import { MatchStatusBadge } from "@/components/companies/MatchBadges";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import {
  HR_DECISION_OPTIONS,
  SHARE_STATUS_OPTIONS,
} from "@/lib/sharing-constants";
import { formatDate, formatScore } from "@/lib/utils";
import type { PaginatedResult } from "@/types";
import type { SharedStudentListItem } from "@/types/sharing";
import { Eye, FileBadge, Share2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface SharedStudentsPageClientProps {
  result: PaginatedResult<SharedStudentListItem>;
  companies: { id: string; name: string }[];
  basePath: string;
  studentsBasePath: string;
  canManage: boolean;
  canManageDrives?: boolean;
  drivesBasePath?: string;
  requirementId?: string;
  linkedDrives?: { id: string; driveTitle: string; status: string }[];
}

export function SharedStudentsPageClient({
  result,
  companies,
  basePath,
  studentsBasePath,
  canManage,
  canManageDrives = false,
  drivesBasePath = "",
  requirementId,
  linkedDrives = [],
}: SharedStudentsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isAddingToDrive, setIsAddingToDrive] = useState(false);
  const [drivePickerOpen, setDrivePickerOpen] = useState(false);
  const [selectedDriveId, setSelectedDriveId] = useState(
    linkedDrives[0]?.id ?? ""
  );

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${basePath}?${params.toString()}`);
  }

  async function revokeSelected() {
    if (selected.length === 0) return;
    if (!confirm(`Revoke ${selected.length} shared profile(s)?`)) return;
    setIsRevoking(true);
    try {
      const res = await fetch("/api/shared-students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", shareIds: selected }),
      });
      if (res.ok) {
        toast("Shares revoked", "success");
        setSelected([]);
        router.refresh();
      } else {
        toast("Revoke failed", "error");
      }
    } finally {
      setIsRevoking(false);
    }
  }

  async function addShortlistedToDrive() {
    if (!requirementId || linkedDrives.length === 0) {
      toast("Filter by requirement with an active drive first", "error");
      return;
    }
    setSelectedDriveId(linkedDrives[0]?.id ?? "");
    setDrivePickerOpen(true);
  }

  async function confirmAddToDrive() {
    if (!selectedDriveId || !requirementId) return;
    if (
      !confirm(
        "Add shortlisted/interested HR shares to the selected placement drive?"
      )
    ) {
      return;
    }
    setIsAddingToDrive(true);
    try {
      const res = await fetch(
        `/api/placement-drives/${selectedDriveId}/add-shares`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requirementId,
            shareIds: selected.length > 0 ? selected : undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Could not add to drive", "error");
        return;
      }
      toast(`Added ${data.added} students to drive`, "success");
      setDrivePickerOpen(false);
      setSelected([]);
      router.refresh();
    } finally {
      setIsAddingToDrive(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shared Students"
        description="Students shared with HR partners and their review status."
        actions={
          <div className="flex gap-2">
            {canManageDrives &&
              requirementId &&
              linkedDrives.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={addShortlistedToDrive}
                  isLoading={isAddingToDrive}
                >
                  Add Shortlisted to Drive
                </Button>
              )}
            {canManage && selected.length > 0 ? (
              <Button
                variant="secondary"
                onClick={revokeSelected}
                isLoading={isRevoking}
              >
                <XCircle className="h-4 w-4" />
                Revoke Selected
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap gap-3 rounded-xl border border-surface-border bg-white p-4">
        <Select
          value={searchParams.get("companyId") ?? ""}
          onChange={(e) => updateFilter("companyId", e.target.value)}
        >
          <option value="">All companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          value={searchParams.get("shareStatus") ?? ""}
          onChange={(e) => updateFilter("shareStatus", e.target.value)}
        >
          <option value="">All share statuses</option>
          {SHARE_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          value={searchParams.get("hrDecision") ?? ""}
          onChange={(e) => updateFilter("hrDecision", e.target.value)}
        >
          <option value="">All HR decisions</option>
          {HR_DECISION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      {result.data.length === 0 ? (
        <EmptyState
          icon={Share2}
          title="No shared students"
          description="Share matched students from a company requirement to appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-surface-border bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-slate-50/80">
                  {canManage && <th className="px-4 py-3 w-10" />}
                  <th className="px-4 py-3 font-medium text-slate-600">Student</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Company / Role</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Match</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Share</th>
                  <th className="px-4 py-3 font-medium text-slate-600">HR Decision</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Shared</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {result.data.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    {canManage && (
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={selected.includes(row.id)}
                          onChange={() =>
                            setSelected((prev) =>
                              prev.includes(row.id)
                                ? prev.filter((id) => id !== row.id)
                                : [...prev, row.id]
                            )
                          }
                          className="rounded"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-900">{row.studentName}</p>
                      <p className="text-xs text-slate-500">
                        {row.rollNumber} · {row.branch}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {row.companyName}
                      <br />
                      <span className="text-xs">{row.roleTitle}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {formatScore(row.matchScore)}
                      <MatchStatusBadge status={row.matchStatus as never} />
                    </td>
                    <td className="px-4 py-3.5">
                      <ShareStatusBadge status={row.shareStatus} />
                    </td>
                    <td className="px-4 py-3.5">
                      <HRDecisionBadge decision={row.hrDecision} />
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {formatDate(row.sharedAt)}
                      {row.expiresAt && (
                        <>
                          <br />
                          Exp: {formatDate(row.expiresAt)}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1">
                        <Link href={`${studentsBasePath}/${row.studentId}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {row.allowPlacementPassport && (
                          <Link
                            href={`${studentsBasePath}/${row.studentId}/passport?requirementId=${row.companyRequirementId}`}
                          >
                            <Button variant="ghost" size="sm" title="View Passport">
                              <FileBadge className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {drivePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Add HR shortlist to drive
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {selected.length > 0
                ? `${selected.length} selected share(s) will be added.`
                : "All interested/shortlisted shares for this requirement will be added."}
            </p>
            <div className="mt-4">
              <Select
                value={selectedDriveId}
                onChange={(e) => setSelectedDriveId(e.target.value)}
              >
                {linkedDrives.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.driveTitle}
                  </option>
                ))}
              </Select>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDrivePickerOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmAddToDrive} isLoading={isAddingToDrive}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
