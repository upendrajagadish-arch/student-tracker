import type { PlacementStatus, ResumeStatus, UserRole } from "@/types";

export const PLACEMENT_STATUS_LABELS: Record<PlacementStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_TRAINING: "In Training",
  READY: "Ready",
  SHORTLISTED: "Shortlisted",
  PLACED: "Placed",
  NEEDS_ATTENTION: "Needs Attention",
};

export const RESUME_STATUS_LABELS: Record<ResumeStatus, string> = {
  NOT_UPLOADED: "Not Uploaded",
  UPLOADED: "Uploaded",
  REVIEWED: "Reviewed",
  APPROVED: "Approved",
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  TPO_ADMIN: "TPO / Placement Admin",
  FACULTY: "Faculty / Trainer",
  HR: "HR / Company",
};

export const PLACEMENT_STATUS_OPTIONS = Object.entries(
  PLACEMENT_STATUS_LABELS
).map(([value, label]) => ({ value: value as PlacementStatus, label }));

export const RESUME_STATUS_OPTIONS = Object.entries(RESUME_STATUS_LABELS).map(
  ([value, label]) => ({ value: value as ResumeStatus, label })
);

export const BRANCHES = [
  "CSE",
  "IT",
  "ECE",
  "EEE",
  "MECH",
  "CIVIL",
  "Computer Science",
  "Information Technology",
];

export const BATCHES = ["2022-2026", "2023-2027", "2024-2028", "2025-2029"];

export const ROLE_DASHBOARD_PATH: Record<UserRole, string> = {
  SUPER_ADMIN: "/admin/dashboard",
  TPO_ADMIN: "/tpo/dashboard",
  FACULTY: "/faculty/dashboard",
  HR: "/hr/dashboard",
};

export const ROLE_LOGIN_HINTS: Record<UserRole, { email: string; password: string }> = {
  SUPER_ADMIN: { email: "admin@placementiq.edu", password: "admin123" },
  TPO_ADMIN: { email: "tpo@placementiq.edu", password: "tpo123" },
  FACULTY: { email: "faculty@placementiq.edu", password: "faculty123" },
  HR: { email: "hr@placementiq.edu", password: "hr123" },
};
