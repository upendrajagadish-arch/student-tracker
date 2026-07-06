import type {
  CompanyRequirementStatus,
  EligibilityStatus,
  MatchStatus,
} from "@/types/company";

export const COMPANY_REQUIREMENT_STATUS_LABELS: Record<
  CompanyRequirementStatus,
  string
> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};

export const COMPANY_REQUIREMENT_STATUS_OPTIONS = (
  Object.keys(COMPANY_REQUIREMENT_STATUS_LABELS) as CompanyRequirementStatus[]
).map((value) => ({
  value,
  label: COMPANY_REQUIREMENT_STATUS_LABELS[value],
}));

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  STRONG_FIT: "Strong Fit",
  GOOD_FIT: "Good Fit",
  AVERAGE_FIT: "Average Fit",
  RISK_FIT: "Risk Fit",
  NOT_FIT: "Not Fit",
};

export const MATCH_STATUS_OPTIONS = (
  Object.keys(MATCH_STATUS_LABELS) as MatchStatus[]
).map((value) => ({
  value,
  label: MATCH_STATUS_LABELS[value],
}));

export const ELIGIBILITY_STATUS_LABELS: Record<EligibilityStatus, string> = {
  ELIGIBLE: "Eligible",
  NOT_ELIGIBLE: "Not Eligible",
  NEEDS_REVIEW: "Needs Review",
};

export const ELIGIBILITY_STATUS_OPTIONS = (
  Object.keys(ELIGIBILITY_STATUS_LABELS) as EligibilityStatus[]
).map((value) => ({
  value,
  label: ELIGIBILITY_STATUS_LABELS[value],
}));

export const MATCH_STATUS_STYLES: Record<MatchStatus, string> = {
  STRONG_FIT: "bg-emerald-50 text-emerald-700",
  GOOD_FIT: "bg-blue-50 text-blue-700",
  AVERAGE_FIT: "bg-sky-50 text-sky-700",
  RISK_FIT: "bg-amber-50 text-amber-800",
  NOT_FIT: "bg-red-50 text-red-700",
};

export const ELIGIBILITY_STATUS_STYLES: Record<EligibilityStatus, string> = {
  ELIGIBLE: "bg-emerald-50 text-emerald-700",
  NOT_ELIGIBLE: "bg-red-50 text-red-700",
  NEEDS_REVIEW: "bg-amber-50 text-amber-800",
};

export const JOB_TYPE_OPTIONS = [
  { value: "FULL_TIME", label: "Full Time" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "CONTRACT", label: "Contract" },
  { value: "APPRENTICESHIP", label: "Apprenticeship" },
];

export const MATCH_SCORE_WEIGHTS = {
  eligibilityBase: 30,
  requiredSkills: 25,
  preferredSkills: 10,
  readiness: 15,
  technical: 10,
  communication: 5,
  resume: 5,
} as const;
