import type { EvidenceSource, EvidenceStrength } from "@/types/skill-evidence";

export const EVIDENCE_SOURCE_LABELS: Record<EvidenceSource, string> = {
  SELF_DECLARED: "Self Declared",
  FACULTY_VERIFIED: "Faculty Verified",
  RESUME_MENTIONED: "Resume Mentioned",
  GITHUB_LANGUAGE: "GitHub Language",
  GITHUB_REPOSITORY: "GitHub Repository",
  CODING_PLATFORM: "Coding Platform",
  COMPANY_REQUIREMENT_MATCH: "Company Requirement",
  PROJECT_EVIDENCE: "Project Evidence",
  CERTIFICATION_EVIDENCE: "Certification",
};

export const EVIDENCE_STRENGTH_LABELS: Record<EvidenceStrength, string> = {
  NONE: "None",
  WEAK: "Weak",
  MODERATE: "Moderate",
  STRONG: "Strong",
  VERIFIED: "Verified",
};

export const EVIDENCE_STRENGTH_OPTIONS = Object.entries(
  EVIDENCE_STRENGTH_LABELS
).map(([value, label]) => ({
  value: value as EvidenceStrength,
  label,
}));

export const EVIDENCE_SOURCE_OPTIONS = Object.entries(EVIDENCE_SOURCE_LABELS).map(
  ([value, label]) => ({
    value: value as EvidenceSource,
    label,
  })
);
