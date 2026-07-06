import { cn } from "@/lib/utils";
import {
  DRIVE_MODE_LABELS,
  DRIVE_STATUS_LABELS,
  FINAL_OUTCOME_LABELS,
  PLACEMENT_STAGE_LABELS,
  PIPELINE_STATUS_LABELS,
} from "@/lib/placement-constants";
import type {
  DriveMode,
  DriveStatus,
  PlacementCurrentStage,
  PlacementFinalOutcome,
  PipelineStatus,
} from "@/types/placement-drive";

const stageColors: Record<PlacementCurrentStage, string> = {
  NOT_REGISTERED: "bg-slate-100 text-slate-700",
  REGISTERED: "bg-blue-50 text-blue-700",
  ELIGIBLE: "bg-sky-50 text-sky-700",
  SHARED_WITH_HR: "bg-indigo-50 text-indigo-700",
  HR_VIEWED: "bg-indigo-50 text-indigo-700",
  HR_INTERESTED: "bg-violet-50 text-violet-700",
  SHORTLISTED: "bg-purple-50 text-purple-700",
  INTERVIEW_SCHEDULED: "bg-fuchsia-50 text-fuchsia-700",
  TECHNICAL_ROUND: "bg-amber-50 text-amber-800",
  HR_ROUND: "bg-orange-50 text-orange-800",
  SELECTED: "bg-emerald-50 text-emerald-800",
  OFFERED: "bg-green-50 text-green-800",
  JOINED: "bg-brand-50 text-brand-800",
  REJECTED: "bg-red-50 text-red-700",
  WITHDRAWN: "bg-slate-100 text-slate-600",
};

const outcomeColors: Record<PlacementFinalOutcome, string> = {
  PENDING: "bg-slate-100 text-slate-600",
  SELECTED: "bg-emerald-50 text-emerald-800",
  REJECTED: "bg-red-50 text-red-700",
  OFFERED: "bg-green-50 text-green-800",
  JOINED: "bg-brand-50 text-brand-800",
  WITHDRAWN: "bg-slate-100 text-slate-600",
  NO_SHOW: "bg-orange-50 text-orange-800",
};

export function DriveStatusBadge({ status }: { status: DriveStatus }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
      {DRIVE_STATUS_LABELS[status]}
    </span>
  );
}

export function DriveModeBadge({ mode }: { mode: DriveMode }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      {DRIVE_MODE_LABELS[mode]}
    </span>
  );
}

export function PlacementStageBadge({
  stage,
}: {
  stage: PlacementCurrentStage;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        stageColors[stage]
      )}
    >
      {PLACEMENT_STAGE_LABELS[stage]}
    </span>
  );
}

export function FinalOutcomeBadge({
  outcome,
}: {
  outcome: PlacementFinalOutcome;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        outcomeColors[outcome]
      )}
    >
      {FINAL_OUTCOME_LABELS[outcome]}
    </span>
  );
}

export function PipelineStatusBadge({
  status,
}: {
  status: PipelineStatus;
}) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
      {PIPELINE_STATUS_LABELS[status]}
    </span>
  );
}
