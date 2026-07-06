import type { UserRole } from "@/types";

export type Permission =
  | "dashboard:view"
  | "students:view"
  | "students:create"
  | "students:edit"
  | "students:delete"
  | "students:update_scores"
  | "students:import"
  | "students:export"
  | "audit:view"
  | "resume:upload"
  | "resume:view"
  | "resume:download"
  | "resume:review"
  | "resume:delete"
  | "techstack:view"
  | "techstack:manage_skills"
  | "techstack:manage_master"
  | "techstack:verify"
  | "techstack:delete"
  | "readiness:view"
  | "readiness:recalculate"
  | "companies:view"
  | "companies:manage"
  | "requirements:view"
  | "requirements:manage"
  | "matching:run"
  | "matching:export"
  | "hr_access:manage"
  | "sharing:manage"
  | "sharing:view"
  | "talent:view"
  | "talent:update"
  | "resume:download_shared"
  | "passport:view"
  | "passport:generate"
  | "passport:print"
  | "analytics:view"
  | "analytics:export"
  | "drives:view"
  | "drives:manage"
  | "drives:export"
  | "drives:update_stage"
  | "drives:update_technical"
  | "reports:view"
  | "reports:export"
  | "github:view"
  | "github:sync"
  | "coding:view"
  | "coding:manage"
  | "coding:verify"
  | "coding:import"
  | "evidence:view"
  | "evidence:refresh"
  | "integrations:view"
  | "integrations:manage"
  | "integrations:test";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    "dashboard:view",
    "students:view",
    "students:create",
    "students:edit",
    "students:delete",
    "students:update_scores",
    "students:import",
    "students:export",
    "audit:view",
    "resume:upload",
    "resume:view",
    "resume:download",
    "resume:review",
    "resume:delete",
    "techstack:view",
    "techstack:manage_skills",
    "techstack:manage_master",
    "techstack:verify",
    "techstack:delete",
    "readiness:view",
    "readiness:recalculate",
    "companies:view",
    "companies:manage",
    "requirements:view",
    "requirements:manage",
    "matching:run",
    "matching:export",
    "hr_access:manage",
    "sharing:manage",
    "sharing:view",
    "passport:view",
    "passport:generate",
    "passport:print",
    "analytics:view",
    "analytics:export",
    "drives:view",
    "drives:manage",
    "drives:export",
    "drives:update_stage",
    "reports:view",
    "reports:export",
    "github:view",
    "github:sync",
    "coding:view",
    "coding:manage",
    "coding:verify",
    "coding:import",
    "evidence:view",
    "evidence:refresh",
    "integrations:view",
    "integrations:manage",
    "integrations:test",
  ],
  TPO_ADMIN: [
    "dashboard:view",
    "students:view",
    "students:create",
    "students:edit",
    "students:delete",
    "students:update_scores",
    "students:import",
    "students:export",
    "resume:upload",
    "resume:view",
    "resume:download",
    "resume:review",
    "techstack:view",
    "techstack:manage_skills",
    "techstack:manage_master",
    "techstack:verify",
    "techstack:delete",
    "readiness:view",
    "readiness:recalculate",
    "companies:view",
    "companies:manage",
    "requirements:view",
    "requirements:manage",
    "matching:run",
    "matching:export",
    "hr_access:manage",
    "sharing:manage",
    "sharing:view",
    "passport:view",
    "passport:generate",
    "passport:print",
    "analytics:view",
    "analytics:export",
    "drives:view",
    "drives:manage",
    "drives:export",
    "drives:update_stage",
    "reports:view",
    "reports:export",
    "github:view",
    "github:sync",
    "coding:view",
    "coding:manage",
    "coding:verify",
    "coding:import",
    "evidence:view",
    "evidence:refresh",
    "integrations:view",
    "integrations:test",
  ],
  FACULTY: [
    "dashboard:view",
    "students:view",
    "students:update_scores",
    "resume:view",
    "resume:download",
    "resume:review",
    "techstack:view",
    "techstack:manage_skills",
    "techstack:verify",
    "readiness:view",
    "readiness:recalculate",
    "companies:view",
    "requirements:view",
    "passport:view",
    "analytics:view",
    "drives:view",
    "drives:update_technical",
    "reports:view",
    "github:view",
    "coding:view",
    "coding:verify",
    "evidence:view",
    "evidence:refresh",
    "integrations:view",
  ],
  HR: [
    "dashboard:view",
    "talent:view",
    "talent:update",
    "resume:download_shared",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canManageStudents(role: UserRole): boolean {
  return hasPermission(role, "students:create");
}

export function canUpdateScores(role: UserRole): boolean {
  return hasPermission(role, "students:update_scores");
}

export function canImportStudents(role: UserRole): boolean {
  return hasPermission(role, "students:import");
}

export function canExportStudents(role: UserRole): boolean {
  return hasPermission(role, "students:export");
}

export function canViewAuditLogs(role: UserRole): boolean {
  return hasPermission(role, "audit:view");
}

export function canUploadResume(role: UserRole): boolean {
  return hasPermission(role, "resume:upload");
}

export function canViewResume(role: UserRole): boolean {
  return hasPermission(role, "resume:view");
}

export function canDownloadResume(role: UserRole): boolean {
  return hasPermission(role, "resume:download");
}

export function canReviewResume(role: UserRole): boolean {
  return hasPermission(role, "resume:review");
}

export function canDeleteResume(role: UserRole): boolean {
  return hasPermission(role, "resume:delete");
}

export function canViewResumeInsights(role: UserRole): boolean {
  return (
    role === "SUPER_ADMIN" || role === "TPO_ADMIN" || role === "FACULTY"
  );
}

export function canAnalyzeResumeInsights(role: UserRole): boolean {
  return canReviewResume(role);
}

export function canApplyResumeInsights(role: UserRole): boolean {
  return canReviewResume(role);
}

export function canViewTechStack(role: UserRole): boolean {
  return hasPermission(role, "techstack:view");
}

export function canManageStudentSkills(role: UserRole): boolean {
  return hasPermission(role, "techstack:manage_skills");
}

export function canManageSkillMaster(role: UserRole): boolean {
  return hasPermission(role, "techstack:manage_master");
}

export function canVerifySkills(role: UserRole): boolean {
  return hasPermission(role, "techstack:verify");
}

export function canDeleteStudentSkills(role: UserRole): boolean {
  return hasPermission(role, "techstack:delete");
}

export function canViewReadiness(role: UserRole): boolean {
  return hasPermission(role, "readiness:view");
}

export function canRecalculateReadiness(role: UserRole): boolean {
  return hasPermission(role, "readiness:recalculate");
}

export function canViewCompanies(role: UserRole): boolean {
  return hasPermission(role, "companies:view");
}

export function canManageCompanies(role: UserRole): boolean {
  return hasPermission(role, "companies:manage");
}

export function canViewRequirements(role: UserRole): boolean {
  return hasPermission(role, "requirements:view");
}

export function canManageRequirements(role: UserRole): boolean {
  return hasPermission(role, "requirements:manage");
}

export function canParseJobDescription(role: UserRole): boolean {
  return canManageRequirements(role);
}

export function canRunMatching(role: UserRole): boolean {
  return hasPermission(role, "matching:run");
}

export function canExportMatching(role: UserRole): boolean {
  return hasPermission(role, "matching:export");
}

export function canManageHrAccess(role: UserRole): boolean {
  return hasPermission(role, "hr_access:manage");
}

export function canManageSharing(role: UserRole): boolean {
  return hasPermission(role, "sharing:manage");
}

export function canViewSharing(role: UserRole): boolean {
  return hasPermission(role, "sharing:view");
}

export function canViewTalentRoom(role: UserRole): boolean {
  return hasPermission(role, "talent:view");
}

export function canUpdateTalentDecision(role: UserRole): boolean {
  return hasPermission(role, "talent:update");
}

export function canDownloadSharedResume(role: UserRole): boolean {
  return hasPermission(role, "resume:download_shared");
}

export function canViewPassport(role: UserRole): boolean {
  return hasPermission(role, "passport:view");
}

export function canGeneratePassport(role: UserRole): boolean {
  return hasPermission(role, "passport:generate");
}

export function canPrintPassport(role: UserRole): boolean {
  return hasPermission(role, "passport:print");
}

export function canViewAnalytics(role: UserRole): boolean {
  return hasPermission(role, "analytics:view");
}

export function canExportAnalytics(role: UserRole): boolean {
  return hasPermission(role, "analytics:export");
}

export function canViewDrives(role: UserRole): boolean {
  return hasPermission(role, "drives:view");
}

export function canManageDrives(role: UserRole): boolean {
  return hasPermission(role, "drives:manage");
}

export function canExportDrives(role: UserRole): boolean {
  return hasPermission(role, "drives:export");
}

export function canUpdateDriveStage(role: UserRole): boolean {
  return hasPermission(role, "drives:update_stage");
}

export function canUpdateDriveTechnical(role: UserRole): boolean {
  return hasPermission(role, "drives:update_technical");
}

export function canViewReports(role: UserRole): boolean {
  return hasPermission(role, "reports:view");
}

export function canExportReports(role: UserRole): boolean {
  return hasPermission(role, "reports:export");
}

export function canManageBranding(role: UserRole): boolean {
  return role === "SUPER_ADMIN";
}

export function canViewBranding(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "TPO_ADMIN";
}

export function canViewGitHub(role: UserRole): boolean {
  return hasPermission(role, "github:view");
}

export function canSyncGitHub(role: UserRole): boolean {
  return hasPermission(role, "github:sync");
}

export function canViewCodingPlatforms(role: UserRole): boolean {
  return hasPermission(role, "coding:view");
}

export function canManageCodingProfiles(role: UserRole): boolean {
  return hasPermission(role, "coding:manage");
}

export function canVerifyCodingProfiles(role: UserRole): boolean {
  return hasPermission(role, "coding:verify");
}

export function canImportCodingProfiles(role: UserRole): boolean {
  return hasPermission(role, "coding:import");
}

export function canViewSkillEvidence(role: UserRole): boolean {
  return hasPermission(role, "evidence:view");
}

export function canRefreshSkillEvidence(role: UserRole): boolean {
  return hasPermission(role, "evidence:refresh");
}

export function canViewIntegrations(role: UserRole): boolean {
  return hasPermission(role, "integrations:view");
}

export function canManageIntegrations(role: UserRole): boolean {
  return hasPermission(role, "integrations:manage");
}

export function canTestIntegrations(role: UserRole): boolean {
  return hasPermission(role, "integrations:test");
}

export function getRolePrefix(role: UserRole): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/admin";
    case "TPO_ADMIN":
      return "/tpo";
    case "FACULTY":
      return "/faculty";
    case "HR":
      return "/hr";
  }
}
