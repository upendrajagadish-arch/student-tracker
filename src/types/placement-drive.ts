export type DriveMode = "ONLINE" | "OFFLINE" | "HYBRID";
export type DriveStatus =
  | "DRAFT"
  | "UPCOMING"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED"
  | "ARCHIVED";

export type PlacementCurrentStage =
  | "NOT_REGISTERED"
  | "REGISTERED"
  | "ELIGIBLE"
  | "SHARED_WITH_HR"
  | "HR_VIEWED"
  | "HR_INTERESTED"
  | "SHORTLISTED"
  | "INTERVIEW_SCHEDULED"
  | "TECHNICAL_ROUND"
  | "HR_ROUND"
  | "SELECTED"
  | "OFFERED"
  | "JOINED"
  | "REJECTED"
  | "WITHDRAWN";

export type PlacementFinalOutcome =
  | "PENDING"
  | "SELECTED"
  | "REJECTED"
  | "OFFERED"
  | "JOINED"
  | "WITHDRAWN"
  | "NO_SHOW";

export type PipelineStatus =
  | "PENDING"
  | "PASSED"
  | "FAILED"
  | "NOT_APPLICABLE"
  | "NOT_ATTENDED";

export type StageAction =
  | "MARK_REGISTERED"
  | "MARK_ELIGIBLE"
  | "MARK_ATTENDED"
  | "MARK_NO_SHOW"
  | "MARK_SHORTLISTED"
  | "MARK_TECHNICAL_CLEARED"
  | "MARK_TECHNICAL_FAILED"
  | "MARK_HR_CLEARED"
  | "MARK_HR_FAILED"
  | "MARK_SELECTED"
  | "MARK_OFFERED"
  | "MARK_JOINED"
  | "MARK_REJECTED"
  | "MARK_WITHDRAWN";

export interface PlacementDriveListItem {
  id: string;
  driveTitle: string;
  driveDate: string | null;
  venue: string | null;
  mode: DriveMode;
  status: DriveStatus;
  companyId: string;
  companyName: string;
  companyRequirementId: string | null;
  roleTitle: string | null;
  studentCount: number;
  joinedCount: number;
  createdAt: string;
}

export interface PlacementDriveDetail extends PlacementDriveListItem {
  notes: string | null;
  createdByUserId: string;
  updatedAt: string;
}

export interface DriveFunnelSummary {
  registered: number;
  eligible: number;
  attended: number;
  shortlisted: number;
  technicalCleared: number;
  hrCleared: number;
  selected: number;
  offered: number;
  joined: number;
  rejected: number;
  withdrawn: number;
  total: number;
}

export interface DriveStageListItem {
  id: string;
  studentId: string;
  fullName: string;
  rollNumber: string;
  branch: string;
  batch: string;
  email: string;
  phone: string | null;
  cgpa: number | null;
  readinessScore: number;
  matchScore: number | null;
  currentStage: PlacementCurrentStage;
  finalOutcome: PlacementFinalOutcome;
  registrationStatus: PipelineStatus;
  attendanceStatus: PipelineStatus;
  technicalRoundStatus: PipelineStatus;
  hrRoundStatus: PipelineStatus;
  offerStatus: PipelineStatus;
  joiningStatus: PipelineStatus;
  packageLpa: number | null;
  offerLocation: string | null;
  rejectionReason: string | null;
  notes: string | null;
  updatedAt: string;
}

export interface StudentPlacementHistoryItem {
  id: string;
  driveId: string;
  driveTitle: string;
  companyName: string;
  roleTitle: string | null;
  driveDate: string | null;
  currentStage: PlacementCurrentStage;
  finalOutcome: PlacementFinalOutcome;
  packageLpa: number | null;
  notes: string | null;
  updatedAt: string;
}

export interface PlacementDriveFilters {
  search?: string;
  status?: DriveStatus;
  companyId?: string;
  page?: number;
  pageSize?: number;
}

export interface DriveStageFilters {
  search?: string;
  branch?: string;
  batch?: string;
  currentStage?: PlacementCurrentStage;
  finalOutcome?: PlacementFinalOutcome;
  attendanceStatus?: PipelineStatus;
  page?: number;
  pageSize?: number;
}
