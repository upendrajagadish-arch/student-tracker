"use client";

import {
  EligibilityStatusBadge,
  MatchStatusBadge,
  RequirementStatusBadge,
  SkillChip,
} from "@/components/companies/MatchBadges";
import { ShareStudentsModal } from "@/components/sharing/ShareStudentsModal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { useToast } from "@/components/ui/Toast";
import { Select } from "@/components/ui/Select";
import {
  ELIGIBILITY_STATUS_OPTIONS,
  MATCH_STATUS_OPTIONS,
} from "@/lib/company-constants";
import { parseApiErrorMessage } from "@/lib/api-errors";
import { formatScore } from "@/lib/utils";
import type {
  CompanyMatchItem,
  CompanyMatchSummary,
  CompanyRequirementDetail,
} from "@/types/company";
import type { PaginatedResult } from "@/types";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  FileBadge,
  RefreshCw,
  Share2,
  CalendarDays,
  Target,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { JobProgressPanel } from "@/components/jobs/JobProgressPanel";
import { JobStatusBadge } from "@/components/jobs/JobStatusBadge";
import type { JobItem } from "@/types/jobs";

interface RequirementDetailClientProps {
  requirement: CompanyRequirementDetail;
  summary: CompanyMatchSummary;
  matches: PaginatedResult<CompanyMatchItem>;
  branches: string[];
  batches: string[];
  basePath: string;
  studentsBasePath: string;
  companyBackPath: string;
  editPath?: string;
  canManage: boolean;
  canRunMatching: boolean;
  canExport: boolean;
  canShare?: boolean;
  canManageDrives?: boolean;
  drivesBasePath?: string;
  linkedDrives?: { id: string; driveTitle: string; status: string }[];
  jobsBasePath?: string;
  latestMatchingJob?: JobItem | null;
}

export function RequirementDetailClient({
  requirement,
  summary,
  matches,
  branches,
  batches,
  basePath,
  studentsBasePath,
  companyBackPath,
  editPath,
  canManage,
  canRunMatching,
  canExport,
  canShare = false,
  canManageDrives = false,
  drivesBasePath = "",
  linkedDrives = [],
  jobsBasePath = "",
  latestMatchingJob = null,
}: RequirementDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(
    latestMatchingJob?.status === "QUEUED" || latestMatchingJob?.status === "RUNNING"
      ? latestMatchingJob.id
      : null
  );
  const [isExporting, setIsExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isBulkSharing, setIsBulkSharing] = useState(false);
  const [isCreatingDrive, setIsCreatingDrive] = useState(false);
  const [isAddingToDrive, setIsAddingToDrive] = useState(false);
  const [drivePickerOpen, setDrivePickerOpen] = useState(false);
  const [pendingDriveAction, setPendingDriveAction] = useState<
    "STRONG_FIT" | "GOOD_AND_STRONG" | "SELECTED" | null
  >(null);
  const [selectedDriveId, setSelectedDriveId] = useState(
    linkedDrives[0]?.id ?? ""
  );

  async function handleRunMatching() {
    setIsRunning(true);
    try {
      const res = await fetch(
        `/api/company-requirements/${requirement.id}/match`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) {
        toast(parseApiErrorMessage(data, "Matching failed"), "error");
        return;
      }
      if (data.jobId) {
        setActiveJobId(data.jobId);
        toast(data.message ?? "Matching job started", "success");
      } else {
        toast(
          `Matching complete: ${data.summary?.strongFit ?? 0} strong fits found`,
          "success"
        );
        router.refresh();
      }
    } catch {
      toast("Matching failed", "error");
    } finally {
      setIsRunning(false);
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await fetch(
        `/api/company-requirements/${requirement.id}/export`
      );
      if (!res.ok) {
        toast("Export failed", "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        "matches.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast("Export downloaded", "success");
    } catch {
      toast("Export failed", "error");
    } finally {
      setIsExporting(false);
    }
  }

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${basePath}?${params.toString()}`);
  }

  function toggleSelect(studentId: string) {
    setSelectedIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  }

  async function handleCreateDrive() {
    if (
      !confirm(
        `Create a placement drive for "${requirement.roleTitle}" at ${requirement.companyName}?`
      )
    ) {
      return;
    }
    setIsCreatingDrive(true);
    try {
      const res = await fetch("/api/placement-drives/from-requirement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirementId: requirement.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(parseApiErrorMessage(data, "Could not create drive"), "error");
        return;
      }
      toast("Placement drive created", "success");
      router.push(`${drivesBasePath}/${data.data.id}`);
    } catch {
      toast("Could not create drive", "error");
    } finally {
      setIsCreatingDrive(false);
    }
  }

  function openAddToDrive(
    matchFilter: "STRONG_FIT" | "GOOD_AND_STRONG" | "SELECTED"
  ) {
    if (matchFilter === "SELECTED" && selectedIds.length === 0) {
      toast("Select students to add to the drive", "error");
      return;
    }
    if (linkedDrives.length === 0) {
      toast("Create a placement drive first", "error");
      return;
    }
    setPendingDriveAction(matchFilter);
    setSelectedDriveId(linkedDrives[0]?.id ?? "");
    setDrivePickerOpen(true);
  }

  async function confirmAddToDrive() {
    if (!pendingDriveAction || !selectedDriveId) return;

    const labels = {
      STRONG_FIT: "strong fit",
      GOOD_AND_STRONG: "good + strong fit",
      SELECTED: "selected",
    };
    if (
      !confirm(
        `Add ${labels[pendingDriveAction]} students to this placement drive?`
      )
    ) {
      return;
    }

    setIsAddingToDrive(true);
    try {
      const res = await fetch(
        `/api/placement-drives/${selectedDriveId}/add-matches`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requirementId: requirement.id,
            matchFilter: pendingDriveAction,
            studentIds:
              pendingDriveAction === "SELECTED" ? selectedIds : undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast(parseApiErrorMessage(data, "Could not add students"), "error");
        return;
      }
      toast(
        `Added ${data.added} students (${data.skipped} already in drive)`,
        "success"
      );
      setDrivePickerOpen(false);
      setPendingDriveAction(null);
      router.refresh();
    } catch {
      toast("Could not add students", "error");
    } finally {
      setIsAddingToDrive(false);
    }
  }

  async function handleBulkShare(matchFilter: "STRONG_FIT" | "GOOD_AND_STRONG") {
    if (
      !confirm(
        `Share all ${matchFilter === "STRONG_FIT" ? "strong fit" : "good + strong fit"} students with HR?`
      )
    ) {
      return;
    }
    setIsBulkSharing(true);
    try {
      const res = await fetch("/api/shared-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: requirement.companyId,
          companyRequirementId: requirement.id,
          matchFilter,
          allowResumeDownload: false,
          allowPlacementPassport: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Bulk share failed", "error");
        return;
      }
      toast(`Shared ${data.count} students with HR`, "success");
      router.refresh();
    } finally {
      setIsBulkSharing(false);
    }
  }

  const hasMatches = summary.totalChecked > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={companyBackPath}
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to company
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">
              {requirement.roleTitle}
            </h1>
            <RequirementStatusBadge status={requirement.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {requirement.companyName}
            {requirement.jobType ? ` · ${requirement.jobType}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRunMatching && (
            <Button onClick={handleRunMatching} isLoading={isRunning}>
              <RefreshCw className="h-4 w-4" />
              {hasMatches ? "Recalculate Matches" : "Run Matching"}
            </Button>
          )}
          {canShare && hasMatches && (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  if (selectedIds.length === 0) {
                    toast("Select students to share", "error");
                    return;
                  }
                  setShareModalOpen(true);
                }}
              >
                <Share2 className="h-4 w-4" />
                Share Selected
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleBulkShare("STRONG_FIT")}
                isLoading={isBulkSharing}
              >
                Share Strong Fits
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleBulkShare("GOOD_AND_STRONG")}
                isLoading={isBulkSharing}
              >
                Share Good+Strong
              </Button>
            </>
          )}
          {canExport && hasMatches && (
            <Button
              variant="secondary"
              onClick={handleExport}
              isLoading={isExporting}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
          {canManage && editPath && (
            <Link href={editPath}>
              <Button variant="secondary">Edit</Button>
            </Link>
          )}
          {canManageDrives && hasMatches && (
            <>
              <Button
                variant="secondary"
                onClick={handleCreateDrive}
                isLoading={isCreatingDrive}
              >
                <CalendarDays className="h-4 w-4" />
                Create Placement Drive
              </Button>
              {linkedDrives.length > 0 && (
                <>
                  <Link href={`${drivesBasePath}/${linkedDrives[0].id}`}>
                    <Button variant="secondary">
                      View Drive
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    onClick={() => openAddToDrive("STRONG_FIT")}
                  >
                    Add Strong Fits to Drive
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => openAddToDrive("GOOD_AND_STRONG")}
                  >
                    Add Good+Strong to Drive
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => openAddToDrive("SELECTED")}
                  >
                    Add Selected to Drive
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {drivePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Add students to drive
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Choose which placement drive should receive these students.
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
              <Button
                variant="secondary"
                onClick={() => {
                  setDrivePickerOpen(false);
                  setPendingDriveAction(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={confirmAddToDrive} isLoading={isAddingToDrive}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {latestMatchingJob &&
        !activeJobId &&
        (latestMatchingJob.status === "COMPLETED" ||
          latestMatchingJob.status === "FAILED") && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-surface-border bg-white p-4 shadow-card">
            <span className="text-sm text-slate-600">Latest matching job:</span>
            <JobStatusBadge status={latestMatchingJob.status} />
            {jobsBasePath && (
              <Link
                href={`${jobsBasePath}/${latestMatchingJob.id}`}
                className="text-sm text-brand-600 hover:underline"
              >
                View details
              </Link>
            )}
          </div>
        )}

      {activeJobId && jobsBasePath && (
        <JobProgressPanel
          jobId={activeJobId}
          jobsBasePath={jobsBasePath}
          title={`Matching: ${requirement.roleTitle}`}
          onComplete={(job) => {
            if (job.status === "COMPLETED") {
              toast("Company matching completed", "success");
            } else if (job.status === "FAILED") {
              toast(job.errorMessage ?? "Matching failed", "error");
            }
          }}
        />
      )}

      {!hasMatches ? (
        <EmptyState
          icon={Target}
          title="No matching results yet"
          description="Run matching to evaluate all students against this requirement's eligibility and fit criteria."
          action={
            canRunMatching ? (
              <Button onClick={handleRunMatching} isLoading={isRunning}>
                Run Matching
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Students Checked"
              value={summary.totalChecked}
              icon={Users}
            />
            <StatCard
              title="Eligible"
              value={summary.eligible}
              icon={CheckCircle2}
            />
            <StatCard
              title="Strong Fit"
              value={summary.strongFit}
              icon={Target}
            />
            <StatCard
              title="Not Eligible"
              value={summary.notEligible}
              icon={XCircle}
            />
            <StatCard title="Good Fit" value={summary.goodFit} icon={Target} />
            <StatCard
              title="Average Fit"
              value={summary.averageFit}
              icon={Users}
            />
            <StatCard
              title="Risk Fit"
              value={summary.riskFit}
              icon={AlertTriangle}
            />
            <StatCard title="Not Fit" value={summary.notFit} icon={XCircle} />
          </div>

          <div className="flex flex-wrap gap-3 rounded-xl border border-surface-border bg-white p-4">
            <input
              type="text"
              placeholder="Search students..."
              defaultValue={searchParams.get("search") ?? ""}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateFilter("search", (e.target as HTMLInputElement).value);
                }
              }}
              className="min-w-[180px] flex-1 rounded-lg border border-surface-border px-3 py-2 text-sm"
            />
            <Select
              value={searchParams.get("matchStatus") ?? ""}
              onChange={(e) => updateFilter("matchStatus", e.target.value)}
            >
              <option value="">All match statuses</option>
              {MATCH_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select
              value={searchParams.get("eligibilityStatus") ?? ""}
              onChange={(e) =>
                updateFilter("eligibilityStatus", e.target.value)
              }
            >
              <option value="">All eligibility</option>
              {ELIGIBILITY_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select
              value={searchParams.get("branch") ?? ""}
              onChange={(e) => updateFilter("branch", e.target.value)}
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
            <Select
              value={searchParams.get("batch") ?? ""}
              onChange={(e) => updateFilter("batch", e.target.value)}
            >
              <option value="">All batches</option>
              {batches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </div>

          <div className="overflow-hidden rounded-xl border border-surface-border bg-white shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-slate-50/80">
                    {canShare && (
                      <th className="px-4 py-3 font-medium text-slate-600 w-10">
                        <span className="sr-only">Select</span>
                      </th>
                    )}
                    <th className="px-4 py-3 font-medium text-slate-600">
                      Student
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-600">
                      Branch / Batch
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-600">
                      Match
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-600">
                      Eligibility
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-600">
                      Scores
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-600">
                      Skills
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-600">
                      Risks
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {matches.data.map((match) => (
                    <tr key={match.id} className="hover:bg-slate-50/50">
                      {canShare && (
                        <td className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(match.studentId)}
                            onChange={() => toggleSelect(match.studentId)}
                            className="rounded"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-900">
                          {match.studentName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {match.rollNumber}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {match.branch}
                        <br />
                        <span className="text-xs">{match.batch}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">
                          {formatScore(match.matchScore)}
                        </p>
                        <MatchStatusBadge status={match.matchStatus} />
                      </td>
                      <td className="px-4 py-3.5">
                        <EligibilityStatusBadge
                          status={match.eligibilityStatus}
                        />
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        R: {formatScore(match.readinessScore)} · T:{" "}
                        {formatScore(match.technicalScore)} · C:{" "}
                        {formatScore(match.communicationScore)} · Res:{" "}
                        {formatScore(match.resumeScore)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex max-w-[200px] flex-wrap gap-1">
                          {match.matchedSkills.slice(0, 3).map((s) => (
                            <SkillChip key={s} label={s} variant="matched" />
                          ))}
                          {match.missingSkills.slice(0, 2).map((s) => (
                            <SkillChip key={s} label={s} variant="missing" />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex max-w-[180px] flex-wrap gap-1">
                          {match.risks.slice(0, 2).map((r) => (
                            <SkillChip key={r} label={r} variant="risk" />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1">
                          <Link href={`${studentsBasePath}/${match.studentId}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link
                            href={`${studentsBasePath}/${match.studentId}/passport?requirementId=${requirement.id}`}
                          >
                            <Button variant="ghost" size="sm" title="View Passport">
                              <FileBadge className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ShareStudentsModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        requirement={requirement}
        studentIds={selectedIds}
        onSuccess={() => {
          setSelectedIds([]);
          router.refresh();
        }}
      />
    </div>
  );
}
