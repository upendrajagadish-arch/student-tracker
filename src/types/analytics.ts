export interface AnalyticsFilters {
  batch?: string;
  branch?: string;
  companyId?: string;
  requirementId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface OverviewAnalytics {
  totalStudents: number;
  placementReady: number;
  highRiskStudents: number;
  activeRequirements: number;
  sharedWithHr: number;
  hrInterested: number;
  hrShortlisted: number;
  avgReadinessScore: number;
}

export interface HrFunnelAnalytics {
  shared: number;
  viewed: number;
  interested: number;
  shortlisted: number;
  rejected: number;
  conversionViewedRate: number;
  conversionInterestedRate: number;
  conversionShortlistedRate: number;
}

export interface CompanyRequirementAnalyticsRow {
  requirementId: string;
  companyName: string;
  roleTitle: string;
  totalMatched: number;
  strongFit: number;
  goodFit: number;
  averageFit: number;
  riskFit: number;
  notEligible: number;
  sharedCount: number;
  hrInterestedCount: number;
  hrShortlistedCount: number;
}

export interface BranchReadinessRow {
  branch: string;
  totalStudents: number;
  avgReadiness: number;
  avgTechnical: number;
  avgCommunication: number;
  resumeApprovedCount: number;
  avgVerifiedSkills: number;
  highRiskCount: number;
}

export interface SkillGapRow {
  skill: string;
  missingCount: number;
  affectedRequirements: number;
  topBranches: string[];
}

export interface ResumeAnalytics {
  uploadedCount: number;
  approvedCount: number;
  needsImprovementCount: number;
  avgResumeScore: number;
  atsFriendlyCount: number;
  missingLinkedInCount: number;
  missingGitHubCount: number;
}

export interface TechStackAnalytics {
  studentsWithTechStack: number;
  avgVerifiedSkillsPerStudent: number;
  topVerifiedSkills: { skill: string; count: number }[];
  unverifiedSkillCount: number;
  topRoleInterests: { role: string; count: number }[];
}

export interface PassportAnalytics {
  passportsGenerated: number;
  hrPassportViews: number;
  internalPassportViews: number;
  printDownloadActions: number;
}

export interface PlacementOutcomeFunnel {
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
}

export interface DriveConversionRow {
  driveId: string;
  driveTitle: string;
  companyName: string;
  registered: number;
  joined: number;
  conversionRate: number;
}

export interface BranchSelectionRow {
  branch: string;
  selectionCount: number;
}

export interface PlacementOutcomeAnalytics {
  totalDrives: number;
  activeDrives: number;
  selectionCount: number;
  offerCount: number;
  joinedCount: number;
  rejectionCount: number;
  avgPackageLpa: number | null;
  funnel: PlacementOutcomeFunnel;
  driveConversions: DriveConversionRow[];
  branchSelections: BranchSelectionRow[];
}

export interface AnalyticsBundle {
  overview: OverviewAnalytics;
  hrFunnel: HrFunnelAnalytics;
  companyRequirements: CompanyRequirementAnalyticsRow[];
  branchReadiness: BranchReadinessRow[];
  skillGaps: SkillGapRow[];
  resume: ResumeAnalytics;
  techStack: TechStackAnalytics;
  passport: PassportAnalytics;
  placementOutcomes: PlacementOutcomeAnalytics;
}

export interface AnalyticsPreview {
  hrFunnel: {
    shared: number;
    interested: number;
    shortlisted: number;
    viewedRate: number;
  };
  topMissingSkills: { skill: string; count: number }[];
  topBranch: { branch: string; avgReadiness: number } | null;
}

export interface AnalyticsFilterOptions {
  branches: string[];
  batches: string[];
  companies: { id: string; name: string }[];
  requirements: { id: string; label: string; companyId: string }[];
}
