import { StudentDetailView } from "@/components/students/StudentDetailView";
import { StudentForm } from "@/components/students/StudentForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import {
  canAnalyzeResumeInsights,
  canApplyResumeInsights,
  canDeleteResume,
  canDeleteStudentSkills,
  canDownloadResume,
  canManageStudentSkills,
  canManageStudents,
  canReviewResume,
  canUploadResume,
  canVerifySkills,
  canRecalculateReadiness,
  canViewPassport,
  hasPermission,
  canViewDrives,
  canViewRequirements,
  getRolePrefix,
  canViewGitHub,
  canSyncGitHub,
  canViewCodingPlatforms,
  canManageCodingProfiles,
  canVerifyCodingProfiles,
  canViewSkillEvidence,
  canRefreshSkillEvidence,
} from "@/lib/permissions";
import { getActiveResumeForStudent } from "@/lib/services/resumes";
import {
  getActiveTechSkills,
  getStudentRoleInterests,
  getStudentTechSkills,
} from "@/lib/services/tech-stack";
import { getLatestReadinessSnapshot } from "@/lib/services/readiness";
import { getStudentCompanyMatches } from "@/lib/services/company-matching";
import { getStudentPlacementHistory } from "@/lib/services/placement-drives";
import { getStudentById } from "@/lib/services/students";
import { getGitHubProfileForStudent, getGitHubLanguageMatchesForStudent } from "@/lib/services/github";
import { getActiveCodingPlatforms, getStudentCodingProfiles } from "@/lib/services/coding-platforms";
import {
  getCompanySkillEvidenceFit,
  getSkillEvidenceForStudent,
} from "@/lib/services/skill-evidence";
import type { UserRole } from "@/types";
import { ArrowLeft, FileBadge, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function StudentDetailPageContent({
  id,
  role,
  basePath,
}: {
  id: string;
  role: UserRole;
  basePath: string;
}) {
  const student = await getStudentById(id);
  if (!student) notFound();

  const resume = await getActiveResumeForStudent(id);
  const viewEvidence = canViewSkillEvidence(role);
  const [
    techSkills,
    roleInterests,
    masterSkills,
    readinessSnapshot,
    companyMatches,
    placementHistory,
    githubProfile,
    githubLanguageMatches,
    codingProfiles,
    codingPlatforms,
    skillEvidenceBundle,
  ] = await Promise.all([
    getStudentTechSkills(id),
    getStudentRoleInterests(id),
    getActiveTechSkills(),
    getLatestReadinessSnapshot(id),
    canViewRequirements(role) ? getStudentCompanyMatches(id) : Promise.resolve([]),
    canViewDrives(role) ? getStudentPlacementHistory(id) : Promise.resolve([]),
    canViewGitHub(role) ? getGitHubProfileForStudent(id) : Promise.resolve(null),
    canViewGitHub(role) ? getGitHubLanguageMatchesForStudent(id) : Promise.resolve([]),
    canViewCodingPlatforms(role) ? getStudentCodingProfiles(id) : Promise.resolve([]),
    canViewCodingPlatforms(role) ? getActiveCodingPlatforms() : Promise.resolve([]),
    viewEvidence ? getSkillEvidenceForStudent(id) : Promise.resolve(null),
  ]);

  const companyEvidenceFits: Record<
    string,
    import("@/types/skill-evidence").CompanySkillEvidenceFit
  > = {};
  if (viewEvidence && companyMatches.length > 0) {
    const fits = await Promise.all(
      companyMatches.slice(0, 5).map((m) =>
        getCompanySkillEvidenceFit(id, m.companyRequirementId)
      )
    );
    for (const fit of fits) {
      if (fit) companyEvidenceFits[fit.requirementId] = fit;
    }
  }

  const canEdit =
    hasPermission(role, "students:edit") ||
    hasPermission(role, "students:update_scores");

  return (
    <div className="space-y-6">
      <PageHeader
        title={student.fullName}
        description={`${student.rollNumber} · ${student.branch}`}
        actions={
          <div className="flex gap-2">
            <Link href={basePath}>
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            {canEdit && (
              <Link href={`${basePath}/${id}/edit`}>
                <Button>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
            )}
            {canViewPassport(role) && (
              <Link href={`${basePath}/${id}/passport`}>
                <Button variant="secondary">
                  <FileBadge className="h-4 w-4" />
                  View Placement Passport
                </Button>
              </Link>
            )}
          </div>
        }
      />
      <StudentDetailView
        student={student}
        resume={resume}
        techSkills={techSkills}
        roleInterests={roleInterests}
        masterSkills={masterSkills}
        editPath={`${basePath}/${id}/edit`}
        canEdit={canEdit}
        canUploadResume={canUploadResume(role)}
        canDownloadResume={canDownloadResume(role)}
        canReviewResume={canReviewResume(role)}
        canDeleteResume={canDeleteResume(role)}
        canAnalyzeResumeInsights={canAnalyzeResumeInsights(role)}
        canApplyResumeInsights={canApplyResumeInsights(role)}
        canManageSkills={canManageStudentSkills(role)}
        canVerifySkills={canVerifySkills(role)}
        canDeleteSkills={canDeleteStudentSkills(role)}
        readinessSnapshot={readinessSnapshot}
        canRecalculateReadiness={canRecalculateReadiness(role)}
        companyMatches={companyMatches}
        companiesBasePath={`${getRolePrefix(role)}/companies`}
        placementHistory={placementHistory}
        drivesBasePath={
          canViewDrives(role) ? `${getRolePrefix(role)}/placement-drives` : ""
        }
        githubProfile={githubProfile}
        canViewGitHub={canViewGitHub(role)}
        canSyncGitHub={canSyncGitHub(role)}
        githubLanguageMatches={githubLanguageMatches}
        codingProfiles={codingProfiles}
        codingPlatforms={codingPlatforms}
        canViewCodingPlatforms={canViewCodingPlatforms(role)}
        canManageCodingProfiles={canManageCodingProfiles(role)}
        canVerifyCodingProfiles={canVerifyCodingProfiles(role)}
        skillEvidenceBundle={skillEvidenceBundle}
        canViewSkillEvidence={viewEvidence}
        canRefreshSkillEvidence={canRefreshSkillEvidence(role)}
        companyEvidenceFits={companyEvidenceFits}
      />
    </div>
  );
}

export async function StudentFormPageContent({
  id,
  role,
  basePath,
  apiBasePath,
  mode,
}: {
  id?: string;
  role: UserRole;
  basePath: string;
  apiBasePath: string;
  mode: "create" | "edit";
}) {
  if (mode === "create" && !canManageStudents(role)) {
    notFound();
  }

  const student = id ? await getStudentById(id) : null;
  if (mode === "edit" && !student) notFound();

  const canEditAll = hasPermission(role, "students:edit");
  const canEditScores = hasPermission(role, "students:update_scores");

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === "create" ? "Add Student" : "Edit Student"}
        description={
          mode === "create"
            ? "Create a new student profile in the placement system."
            : `Update profile for ${student?.fullName}`
        }
      />
      <StudentForm
        initialData={student ?? undefined}
        mode={mode}
        apiBasePath={apiBasePath}
        redirectPath={
          mode === "create" ? basePath : `${basePath}/${id}`
        }
        canEditScores={canEditScores}
        canEditAllFields={canEditAll}
      />
    </div>
  );
}
