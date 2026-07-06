import type {
  DriveMode,
  DriveStatus,
  PlacementCurrentStage,
  PlacementFinalOutcome,
  PipelineStatus,
  StageAction,
} from "@/types/placement-drive";

export const DRIVE_MODE_LABELS: Record<DriveMode, string> = {
  ONLINE: "Online",
  OFFLINE: "On Campus",
  HYBRID: "Hybrid",
};

export const DRIVE_STATUS_LABELS: Record<DriveStatus, string> = {
  DRAFT: "Draft",
  UPCOMING: "Upcoming",
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  ARCHIVED: "Archived",
};

export const PLACEMENT_STAGE_LABELS: Record<PlacementCurrentStage, string> = {
  NOT_REGISTERED: "Not Registered",
  REGISTERED: "Registered",
  ELIGIBLE: "Eligible",
  SHARED_WITH_HR: "Shared with HR",
  HR_VIEWED: "HR Viewed",
  HR_INTERESTED: "HR Interested",
  SHORTLISTED: "Shortlisted",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  TECHNICAL_ROUND: "Technical Round",
  HR_ROUND: "HR Round",
  SELECTED: "Selected",
  OFFERED: "Offered",
  JOINED: "Joined",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export const FINAL_OUTCOME_LABELS: Record<PlacementFinalOutcome, string> = {
  PENDING: "Pending",
  SELECTED: "Selected",
  REJECTED: "Rejected",
  OFFERED: "Offered",
  JOINED: "Joined",
  WITHDRAWN: "Withdrawn",
  NO_SHOW: "No Show",
};

export const PIPELINE_STATUS_LABELS: Record<PipelineStatus, string> = {
  PENDING: "Pending",
  PASSED: "Passed",
  FAILED: "Failed",
  NOT_APPLICABLE: "N/A",
  NOT_ATTENDED: "Not Attended",
};

export const STAGE_ACTION_LABELS: Record<StageAction, string> = {
  MARK_REGISTERED: "Mark Registered",
  MARK_ELIGIBLE: "Mark Eligible",
  MARK_ATTENDED: "Mark Attended",
  MARK_NO_SHOW: "Mark No Show",
  MARK_SHORTLISTED: "Mark Shortlisted",
  MARK_TECHNICAL_CLEARED: "Technical Cleared",
  MARK_TECHNICAL_FAILED: "Technical Failed",
  MARK_HR_CLEARED: "HR Cleared",
  MARK_HR_FAILED: "HR Failed",
  MARK_SELECTED: "Mark Selected",
  MARK_OFFERED: "Mark Offered",
  MARK_JOINED: "Mark Joined",
  MARK_REJECTED: "Mark Rejected",
  MARK_WITHDRAWN: "Mark Withdrawn",
};

export const DRIVE_STATUS_OPTIONS = Object.entries(DRIVE_STATUS_LABELS).map(
  ([value, label]) => ({ value: value as DriveStatus, label })
);

export const STAGE_FILTER_OPTIONS = Object.entries(PLACEMENT_STAGE_LABELS).map(
  ([value, label]) => ({ value: value as PlacementCurrentStage, label })
);

export const OUTCOME_FILTER_OPTIONS = Object.entries(FINAL_OUTCOME_LABELS).map(
  ([value, label]) => ({ value: value as PlacementFinalOutcome, label })
);

/** Stages counted as "registered" or beyond */
const REGISTERED_STAGES: PlacementCurrentStage[] = [
  "REGISTERED",
  "ELIGIBLE",
  "SHARED_WITH_HR",
  "HR_VIEWED",
  "HR_INTERESTED",
  "SHORTLISTED",
  "INTERVIEW_SCHEDULED",
  "TECHNICAL_ROUND",
  "HR_ROUND",
  "SELECTED",
  "OFFERED",
  "JOINED",
];

const ELIGIBLE_STAGES: PlacementCurrentStage[] = [
  "ELIGIBLE",
  "SHARED_WITH_HR",
  "HR_VIEWED",
  "HR_INTERESTED",
  "SHORTLISTED",
  "INTERVIEW_SCHEDULED",
  "TECHNICAL_ROUND",
  "HR_ROUND",
  "SELECTED",
  "OFFERED",
  "JOINED",
];

export function isRegisteredStage(stage: PlacementCurrentStage): boolean {
  return REGISTERED_STAGES.includes(stage);
}

export function isEligibleStage(stage: PlacementCurrentStage): boolean {
  return ELIGIBLE_STAGES.includes(stage);
}

export function applyStageAction(
  action: StageAction,
  current: {
    currentStage: PlacementCurrentStage;
    finalOutcome: PlacementFinalOutcome;
    registrationStatus: PipelineStatus;
    attendanceStatus: PipelineStatus;
    technicalRoundStatus: PipelineStatus;
    hrRoundStatus: PipelineStatus;
    offerStatus: PipelineStatus;
    joiningStatus: PipelineStatus;
    rejectionReason?: string | null;
    packageLpa?: number | null;
    offerLocation?: string | null;
  },
  extras?: { rejectionReason?: string; packageLpa?: number; offerLocation?: string }
) {
  const next = { ...current };

  switch (action) {
    case "MARK_REGISTERED":
      next.currentStage = "REGISTERED";
      next.registrationStatus = "PASSED";
      next.finalOutcome = "PENDING";
      break;
    case "MARK_ELIGIBLE":
      next.currentStage = "ELIGIBLE";
      next.registrationStatus = "PASSED";
      next.finalOutcome = "PENDING";
      break;
    case "MARK_ATTENDED":
      next.attendanceStatus = "PASSED";
      if (next.currentStage === "REGISTERED" || next.currentStage === "ELIGIBLE") {
        next.currentStage = "ELIGIBLE";
      }
      break;
    case "MARK_NO_SHOW":
      next.attendanceStatus = "NOT_ATTENDED";
      next.finalOutcome = "NO_SHOW";
      next.currentStage = "REJECTED";
      break;
    case "MARK_SHORTLISTED":
      next.currentStage = "SHORTLISTED";
      next.finalOutcome = "PENDING";
      break;
    case "MARK_TECHNICAL_CLEARED":
      next.technicalRoundStatus = "PASSED";
      next.currentStage = "TECHNICAL_ROUND";
      next.finalOutcome = "PENDING";
      break;
    case "MARK_TECHNICAL_FAILED":
      next.technicalRoundStatus = "FAILED";
      next.currentStage = "REJECTED";
      next.finalOutcome = "REJECTED";
      next.rejectionReason = extras?.rejectionReason ?? "Technical round not cleared";
      break;
    case "MARK_HR_CLEARED":
      next.hrRoundStatus = "PASSED";
      next.currentStage = "HR_ROUND";
      next.finalOutcome = "PENDING";
      break;
    case "MARK_HR_FAILED":
      next.hrRoundStatus = "FAILED";
      next.currentStage = "REJECTED";
      next.finalOutcome = "REJECTED";
      next.rejectionReason = extras?.rejectionReason ?? "HR round not cleared";
      break;
    case "MARK_SELECTED":
      next.currentStage = "SELECTED";
      next.finalOutcome = "SELECTED";
      break;
    case "MARK_OFFERED":
      next.currentStage = "OFFERED";
      next.finalOutcome = "OFFERED";
      next.offerStatus = "PASSED";
      if (extras?.packageLpa != null) next.packageLpa = extras.packageLpa;
      if (extras?.offerLocation) next.offerLocation = extras.offerLocation;
      break;
    case "MARK_JOINED":
      next.currentStage = "JOINED";
      next.finalOutcome = "JOINED";
      next.joiningStatus = "PASSED";
      next.offerStatus = next.offerStatus === "PENDING" ? "PASSED" : next.offerStatus;
      break;
    case "MARK_REJECTED":
      next.currentStage = "REJECTED";
      next.finalOutcome = "REJECTED";
      next.rejectionReason = extras?.rejectionReason ?? "Rejected";
      break;
    case "MARK_WITHDRAWN":
      next.currentStage = "WITHDRAWN";
      next.finalOutcome = "WITHDRAWN";
      break;
  }

  return next;
}

export const BULK_STAGE_ACTIONS: StageAction[] = [
  "MARK_ATTENDED",
  "MARK_SHORTLISTED",
  "MARK_TECHNICAL_CLEARED",
  "MARK_REJECTED",
  "MARK_SELECTED",
  "MARK_OFFERED",
];
