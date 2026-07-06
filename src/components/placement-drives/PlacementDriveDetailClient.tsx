"use client";

import {
  FinalOutcomeBadge,
  PlacementStageBadge,
  PipelineStatusBadge,
  DriveModeBadge,
  DriveStatusBadge,
} from "@/components/placement-drives/PlacementStageBadges";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import {
  BULK_STAGE_ACTIONS,
  OUTCOME_FILTER_OPTIONS,
  STAGE_ACTION_LABELS,
  STAGE_FILTER_OPTIONS,
} from "@/lib/placement-constants";
import { parseApiErrorMessage } from "@/lib/api-errors";
import { formatDate, formatScore } from "@/lib/utils";
import type { PaginatedResult } from "@/types";
import type {
  DriveFunnelSummary,
  DriveStageListItem,
  PlacementDriveDetail,
  StageAction,
} from "@/types/placement-drive";
import {
  Download,
  Pencil,
  Target,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface PlacementDriveDetailClientProps {
  drive: PlacementDriveDetail;
  funnel: DriveFunnelSummary;
  stages: PaginatedResult<DriveStageListItem>;
  basePath: string;
  studentsBasePath: string;
  branches: string[];
  batches: string[];
  canManage: boolean;
  canExport: boolean;
  canUpdateStage: boolean;
  canUpdateTechnical: boolean;
}

const FUNNEL_STEPS: { key: keyof DriveFunnelSummary; label: string }[] = [
  { key: "registered", label: "Registered" },
  { key: "eligible", label: "Eligible" },
  { key: "attended", label: "Attended" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "technicalCleared", label: "Tech Cleared" },
  { key: "hrCleared", label: "HR Cleared" },
  { key: "selected", label: "Selected" },
  { key: "offered", label: "Offered" },
  { key: "joined", label: "Joined" },
  { key: "rejected", label: "Rejected" },
];

export function PlacementDriveDetailClient({
  drive,
  funnel,
  stages,
  basePath,
  studentsBasePath,
  branches,
  batches,
  canManage,
  canExport,
  canUpdateStage,
  canUpdateTechnical,
}: PlacementDriveDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<StageAction>("MARK_ATTENDED");
  const [isBulkRunning, setIsBulkRunning] = useState(false);
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; fullName: string; rollNumber: string }[]
  >([]);
  const [isExporting, setIsExporting] = useState(false);

  const canAct = canUpdateStage || canUpdateTechnical;

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${basePath}/${drive.id}?${params.toString()}`);
  }

  async function runStageAction(stageId: string, action: StageAction) {
    const res = await fetch(
      `/api/placement-drives/${drive.id}/students/${stageId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      toast(parseApiErrorMessage(data, "Update failed"), "error");
      return;
    }
    toast("Stage updated", "success");
    router.refresh();
  }

  async function handleBulkUpdate() {
    if (selected.length === 0) return;
    setIsBulkRunning(true);
    try {
      const res = await fetch(`/api/placement-drives/${drive.id}/students/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageIds: selected, action: bulkAction }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(parseApiErrorMessage(data, "Bulk update failed"), "error");
        return;
      }
      toast(`Updated ${data.count} students`, "success");
      setSelected([]);
      router.refresh();
    } finally {
      setIsBulkRunning(false);
    }
  }

  async function searchStudents() {
    const res = await fetch(
      `/api/students?search=${encodeURIComponent(studentSearch)}&pageSize=10`
    );
    const data = await res.json();
    setSearchResults(data.data ?? []);
  }

  async function addStudents(ids: string[]) {
    const res = await fetch(`/api/placement-drives/${drive.id}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentIds: ids }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(parseApiErrorMessage(data, "Could not add students"), "error");
      return;
    }
    toast(`Added ${data.added} students (${data.skipped} already in drive)`, "success");
    setShowAddStudents(false);
    router.refresh();
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/placement-drives/${drive.id}/export`);
      if (!res.ok) {
        toast("Export failed", "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `drive-pipeline-${drive.id}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  const allowedActions = Object.entries(STAGE_ACTION_LABELS).filter(([action]) => {
    if (canUpdateStage) return true;
    if (canUpdateTechnical) {
      return action === "MARK_TECHNICAL_CLEARED" || action === "MARK_TECHNICAL_FAILED";
    }
    return false;
  });

  const maxFunnel = Math.max(...FUNNEL_STEPS.map((s) => funnel[s.key]), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">{drive.driveTitle}</h1>
            <DriveStatusBadge status={drive.status} />
            <DriveModeBadge mode={drive.mode} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {drive.companyName}
            {drive.roleTitle ? ` · ${drive.roleTitle}` : ""}
            {drive.driveDate ? ` · ${formatDate(drive.driveDate)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && (
            <Link href={`${basePath}/${drive.id}/edit`}>
              <Button variant="secondary">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </Link>
          )}
          {canExport && (
            <Button variant="secondary" onClick={handleExport} isLoading={isExporting}>
              <Download className="h-4 w-4" />
              Export Pipeline
            </Button>
          )}
          {canManage && (
            <Button onClick={() => setShowAddStudents(true)}>
              <UserPlus className="h-4 w-4" />
              Add Students
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="In Pipeline" value={String(funnel.total)} icon={Users} />
        <StatCard title="Registered" value={String(funnel.registered)} icon={UserCheck} />
        <StatCard title="Shortlisted" value={String(funnel.shortlisted)} icon={Target} />
        <StatCard title="Selected" value={String(funnel.selected)} icon={Target} />
        <StatCard title="Joined" value={String(funnel.joined)} icon={UserCheck} />
      </div>

      <div className="rounded-xl border border-surface-border bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Outcome Funnel</h2>
        <div className="space-y-2">
          {FUNNEL_STEPS.map((step) => {
            const count = funnel[step.key];
            const pct = Math.round((count / maxFunnel) * 100);
            return (
              <div key={step.key} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-slate-600">{step.label}</span>
                <div className="h-2 flex-1 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-brand-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-right font-medium text-slate-900">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-surface-border bg-white p-4">
        <input
          type="text"
          placeholder="Search students..."
          defaultValue={searchParams.get("search") ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateFilter("search", (e.target as HTMLInputElement).value);
          }}
          className="min-w-[140px] flex-1 rounded-lg border border-surface-border px-3 py-2 text-sm"
        />
        <Select
          value={searchParams.get("branch") ?? ""}
          onChange={(e) => updateFilter("branch", e.target.value)}
        >
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </Select>
        <Select
          value={searchParams.get("batch") ?? ""}
          onChange={(e) => updateFilter("batch", e.target.value)}
        >
          <option value="">All batches</option>
          {batches.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </Select>
        <Select
          value={searchParams.get("currentStage") ?? ""}
          onChange={(e) => updateFilter("currentStage", e.target.value)}
        >
          <option value="">All stages</option>
          {STAGE_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
        <Select
          value={searchParams.get("finalOutcome") ?? ""}
          onChange={(e) => updateFilter("finalOutcome", e.target.value)}
        >
          <option value="">All outcomes</option>
          {OUTCOME_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </div>

      {canUpdateStage && selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
          <span className="text-sm font-medium text-brand-900">
            {selected.length} selected
          </span>
          <Select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value as StageAction)}
            className="w-48"
          >
            {BULK_STAGE_ACTIONS.map((a) => (
              <option key={a} value={a}>{STAGE_ACTION_LABELS[a]}</option>
            ))}
          </Select>
          <Button size="sm" onClick={handleBulkUpdate} isLoading={isBulkRunning}>
            Apply to Selected
          </Button>
        </div>
      )}

      {stages.data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students in this drive"
          description="Add students manually or from company matching results."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface-border bg-white">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-surface-border bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {canUpdateStage && (
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.length === stages.data.length}
                      onChange={(e) =>
                        setSelected(e.target.checked ? stages.data.map((s) => s.id) : [])
                      }
                    />
                  </th>
                )}
                <th className="px-3 py-3">Student</th>
                <th className="px-3 py-3">Branch</th>
                <th className="px-3 py-3">Readiness</th>
                <th className="px-3 py-3">Match</th>
                <th className="px-3 py-3">Stage</th>
                <th className="px-3 py-3">Outcome</th>
                <th className="px-3 py-3">Attendance</th>
                <th className="px-3 py-3">Tech / HR</th>
                <th className="px-3 py-3">Package</th>
                {canAct && <th className="px-3 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {stages.data.map((row) => (
                <tr key={row.id} className="border-b border-surface-border last:border-0">
                  {canUpdateStage && (
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(row.id)}
                        onChange={(e) =>
                          setSelected((prev) =>
                            e.target.checked
                              ? [...prev, row.id]
                              : prev.filter((id) => id !== row.id)
                          )
                        }
                      />
                    </td>
                  )}
                  <td className="px-3 py-3">
                    <Link
                      href={`${studentsBasePath}/${row.studentId}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {row.fullName}
                    </Link>
                    <p className="text-xs text-slate-500">{row.rollNumber}</p>
                  </td>
                  <td className="px-3 py-3">{row.branch}</td>
                  <td className="px-3 py-3">{formatScore(row.readinessScore)}</td>
                  <td className="px-3 py-3">
                    {row.matchScore != null ? formatScore(row.matchScore) : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <PlacementStageBadge stage={row.currentStage} />
                  </td>
                  <td className="px-3 py-3">
                    <FinalOutcomeBadge outcome={row.finalOutcome} />
                  </td>
                  <td className="px-3 py-3">
                    <PipelineStatusBadge status={row.attendanceStatus} />
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <PipelineStatusBadge status={row.technicalRoundStatus} />
                    {" / "}
                    <PipelineStatusBadge status={row.hrRoundStatus} />
                  </td>
                  <td className="px-3 py-3">
                    {row.packageLpa != null ? `${row.packageLpa} LPA` : "—"}
                  </td>
                  {canAct && (
                    <td className="px-3 py-3">
                      <Select
                        defaultValue=""
                        onChange={(e) => {
                          const action = e.target.value as StageAction;
                          if (action) void runStageAction(row.id, action);
                          e.target.value = "";
                        }}
                        className="min-w-[140px] text-xs"
                      >
                        <option value="">Update stage...</option>
                        {allowedActions.map(([action, label]) => (
                          <option key={action} value={action}>{label}</option>
                        ))}
                      </Select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddStudents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setShowAddStudents(false)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-surface-border bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">Add students</h2>
            <p className="mt-1 text-sm text-slate-500">
              Search by name or roll number to add students to this drive.
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search students"
                  className="flex-1 rounded-lg border border-surface-border px-3 py-2 text-sm"
                />
                <Button type="button" variant="secondary" onClick={searchStudents}>
                  Search
                </Button>
              </div>
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {searchResults.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2 text-sm"
                  >
                    <span>
                      {s.fullName} · {s.rollNumber}
                    </span>
                    <Button size="sm" onClick={() => addStudents([s.id])}>
                      Add
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={() => setShowAddStudents(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
