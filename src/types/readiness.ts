export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ReadinessStatus =
  | "NOT_READY"
  | "NEEDS_IMPROVEMENT"
  | "NEAR_READY"
  | "PLACEMENT_READY"
  | "HIGHLY_READY";

export interface ScoreBreakdown {
  weights: {
    technical: number;
    communication: number;
    resume: number;
    techStack: number;
    profile: number;
    academic: number;
  };
  components: {
    technicalReadiness: number;
    communicationReadiness: number;
    resumeReadiness: number;
    techStackReadiness: number;
    profileReadiness: number;
    academicReadiness: number;
  };
  criticalGaps: string[];
  profileChecks: Record<string, boolean>;
}

export interface ReadinessSnapshotItem {
  id: string;
  studentId: string;
  overallScore: number;
  technicalReadiness: number;
  communicationReadiness: number;
  resumeReadiness: number;
  techStackReadiness: number;
  profileReadiness: number;
  academicReadiness: number;
  riskLevel: RiskLevel;
  readinessStatus: ReadinessStatus;
  nextRecommendedAction: string;
  scoreBreakdown: ScoreBreakdown;
  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReadinessOverviewItem {
  studentId: string;
  fullName: string;
  rollNumber: string;
  branch: string;
  batch: string;
  overallScore: number;
  readinessStatus: ReadinessStatus;
  riskLevel: RiskLevel;
  technicalReadiness: number;
  communicationReadiness: number;
  resumeReadiness: number;
  techStackReadiness: number;
  nextRecommendedAction: string;
  calculatedAt: Date | null;
  snapshotId: string | null;
}

export interface ReadinessFilters {
  search?: string;
  branch?: string;
  batch?: string;
  riskLevel?: RiskLevel;
  readinessStatus?: ReadinessStatus;
  minScore?: number;
  maxScore?: number;
  page?: number;
  pageSize?: number;
}

export interface ReadinessDashboardStats {
  placementReadyCount: number;
  highRiskCount: number;
  avgReadinessScore: number;
  statusDistribution: { status: ReadinessStatus; count: number }[];
  riskDistribution: { risk: RiskLevel; count: number }[];
  topGaps: { gap: string; count: number }[];
}
