import type { CompanyRequirementInput } from "@/lib/validations/company";
import type { JDParseDraft, JDParseResult } from "@/types/jd-parser";

export function draftToRequirementInput(
  draft: JDParseDraft,
  companyId: string
): CompanyRequirementInput {
  return {
    companyId,
    roleTitle: draft.roleTitle?.trim() || "Untitled Role",
    jobType: draft.jobType ?? "",
    eligibleBranches: draft.eligibleBranches,
    eligibleBatches: draft.eligibleBatches,
    graduationYear: draft.graduationYear ?? undefined,
    minCgpa: draft.minCgpa ?? undefined,
    allowActiveBacklogs: draft.allowActiveBacklogs,
    maxActiveBacklogs: draft.maxActiveBacklogs,
    requiredSkills: draft.requiredSkills,
    preferredSkills: draft.preferredSkills,
    requiredRoleInterests: draft.requiredRoleInterests,
    minTechnicalScore: draft.minTechnicalScore,
    minCommunicationScore: draft.minCommunicationScore,
    minResumeScore: draft.minResumeScore,
    minReadinessScore: draft.minReadinessScore,
    requireResumeApproved: draft.requireResumeApproved,
    requireAtsFriendly: draft.requireAtsFriendly,
    requireLinkedIn: draft.requireLinkedIn,
    requireGitHub: draft.requireGitHub,
    notes: draft.notes ?? "",
    status: "DRAFT",
  };
}

export function confidenceLabel(score: number): string {
  const pct = Math.round(score * 100);
  if (pct >= 80) return "High";
  if (pct >= 55) return "Medium";
  return "Low";
}

export function confidenceBadgeClass(score: number): string {
  const pct = score * 100;
  if (pct >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (pct >= 55) return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export function providerLabel(result: JDParseResult): string {
  return result.provider === "openai" ? "AI-assisted" : "Rule-based";
}
