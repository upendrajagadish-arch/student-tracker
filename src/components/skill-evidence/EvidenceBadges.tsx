"use client";

import {
  EVIDENCE_SOURCE_LABELS,
  EVIDENCE_STRENGTH_LABELS,
} from "@/lib/skill-evidence-constants";
import type { EvidenceSource, EvidenceStrength } from "@/types/skill-evidence";

const STRENGTH_STYLES: Record<EvidenceStrength, string> = {
  NONE: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
  WEAK: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
  MODERATE: "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200",
  STRONG: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200",
  VERIFIED: "bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200",
};

const SOURCE_STYLES: Record<EvidenceSource, string> = {
  SELF_DECLARED: "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200",
  FACULTY_VERIFIED: "bg-violet-50 text-violet-800 ring-1 ring-inset ring-violet-200",
  RESUME_MENTIONED: "bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200",
  GITHUB_LANGUAGE: "bg-slate-800 text-white",
  GITHUB_REPOSITORY: "bg-slate-700 text-white",
  CODING_PLATFORM: "bg-orange-50 text-orange-800 ring-1 ring-inset ring-orange-200",
  COMPANY_REQUIREMENT_MATCH: "bg-indigo-50 text-indigo-800 ring-1 ring-inset ring-indigo-200",
  PROJECT_EVIDENCE: "bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-200",
  CERTIFICATION_EVIDENCE: "bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-200",
};

export function EvidenceStrengthBadge({
  strength,
  className = "",
}: {
  strength: EvidenceStrength;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STRENGTH_STYLES[strength]} ${className}`}
      title="Evidence strength reflects how many independent sources support this skill."
    >
      {EVIDENCE_STRENGTH_LABELS[strength]}
    </span>
  );
}

export function EvidenceSourceChip({
  source,
}: {
  source: EvidenceSource;
}) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${SOURCE_STYLES[source]}`}
    >
      {EVIDENCE_SOURCE_LABELS[source]}
    </span>
  );
}
