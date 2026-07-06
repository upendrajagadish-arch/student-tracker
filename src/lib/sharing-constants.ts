import type { HRAccessRole, HRDecision, ShareStatus } from "@/types/sharing";

export const HR_ACCESS_ROLE_LABELS: Record<HRAccessRole, string> = {
  HR_VIEWER: "Viewer",
  HR_RECRUITER: "Recruiter",
  HR_MANAGER: "Manager",
};

export const HR_ACCESS_ROLE_OPTIONS = (
  Object.keys(HR_ACCESS_ROLE_LABELS) as HRAccessRole[]
).map((value) => ({ value, label: HR_ACCESS_ROLE_LABELS[value] }));

export const SHARE_STATUS_LABELS: Record<ShareStatus, string> = {
  SHARED: "Shared",
  VIEWED: "Viewed",
  SHORTLISTED: "Shortlisted",
  REJECTED: "Rejected",
  REVOKED: "Revoked",
  EXPIRED: "Expired",
};

export const SHARE_STATUS_STYLES: Record<ShareStatus, string> = {
  SHARED: "bg-blue-50 text-blue-700",
  VIEWED: "bg-sky-50 text-sky-700",
  SHORTLISTED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  REVOKED: "bg-slate-100 text-slate-500",
  EXPIRED: "bg-slate-100 text-slate-500",
};

export const HR_DECISION_LABELS: Record<HRDecision, string> = {
  PENDING: "Pending",
  INTERESTED: "Interested",
  NOT_INTERESTED: "Not Interested",
  SHORTLISTED: "Shortlisted",
  NEEDS_MORE_INFO: "Needs More Info",
};

export const HR_DECISION_OPTIONS = (
  Object.keys(HR_DECISION_LABELS) as HRDecision[]
).map((value) => ({ value, label: HR_DECISION_LABELS[value] }));

export const HR_DECISION_STYLES: Record<HRDecision, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  INTERESTED: "bg-emerald-50 text-emerald-700",
  NOT_INTERESTED: "bg-red-50 text-red-700",
  SHORTLISTED: "bg-blue-50 text-blue-700",
  NEEDS_MORE_INFO: "bg-amber-50 text-amber-800",
};

export const SHARE_STATUS_OPTIONS = (
  Object.keys(SHARE_STATUS_LABELS) as ShareStatus[]
).map((value) => ({
  value,
  label: SHARE_STATUS_LABELS[value],
}));

export const ACTIVE_SHARE_STATUSES: ShareStatus[] = [
  "SHARED",
  "VIEWED",
  "SHORTLISTED",
  "REJECTED",
];
