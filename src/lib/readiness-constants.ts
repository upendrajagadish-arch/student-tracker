import type { ReadinessStatus, RiskLevel } from "@/types/readiness";

export const READINESS_WEIGHTS = {
  technical: 0.25,
  communication: 0.2,
  resume: 0.2,
  techStack: 0.15,
  profile: 0.1,
  academic: 0.1,
} as const;

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  LOW: "Low Risk",
  MEDIUM: "Medium Risk",
  HIGH: "High Risk",
  CRITICAL: "Critical Risk",
};

export const READINESS_STATUS_LABELS: Record<ReadinessStatus, string> = {
  NOT_READY: "Not Ready",
  NEEDS_IMPROVEMENT: "Needs Improvement",
  NEAR_READY: "Near Ready",
  PLACEMENT_READY: "Placement Ready",
  HIGHLY_READY: "Highly Ready",
};

export const RISK_LEVEL_OPTIONS = Object.entries(RISK_LEVEL_LABELS).map(
  ([value, label]) => ({ value: value as RiskLevel, label })
);

export const READINESS_STATUS_OPTIONS = Object.entries(
  READINESS_STATUS_LABELS
).map(([value, label]) => ({
  value: value as ReadinessStatus,
  label,
}));

export const RISK_BADGE_STYLES: Record<RiskLevel, string> = {
  LOW: "bg-emerald-50 text-emerald-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  HIGH: "bg-orange-50 text-orange-700",
  CRITICAL: "bg-red-50 text-red-700",
};

export const READINESS_STATUS_BADGE_STYLES: Record<ReadinessStatus, string> = {
  NOT_READY: "bg-slate-100 text-slate-700",
  NEEDS_IMPROVEMENT: "bg-amber-50 text-amber-800",
  NEAR_READY: "bg-blue-50 text-blue-700",
  PLACEMENT_READY: "bg-emerald-50 text-emerald-700",
  HIGHLY_READY: "bg-violet-50 text-violet-700",
};

export const READINESS_CATEGORY_LABELS = {
  technicalReadiness: "Technical",
  communicationReadiness: "Communication",
  resumeReadiness: "Resume",
  techStackReadiness: "Tech Stack",
  profileReadiness: "Profile",
  academicReadiness: "Academic",
} as const;
