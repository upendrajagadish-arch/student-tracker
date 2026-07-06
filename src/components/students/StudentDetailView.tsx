"use client";

import { GitHubEvidenceCard } from "@/components/github/GitHubEvidenceCard";
import { CodingProfilesCard } from "@/components/coding-platforms/CodingProfilesCard";
import { SkillEvidenceCard } from "@/components/skill-evidence/SkillEvidenceCard";
import { ResumeReviewCard } from "@/components/students/ResumeReviewCard";
import { ResumeInsightsCard } from "@/components/students/ResumeInsightsCard";
import {
  RoleInterestsCard,
  TechStackCard,
} from "@/components/tech-stack/TechStackCard";
import { PlacementReadinessCard } from "@/components/readiness/PlacementReadinessCard";
import { CompanyFitCard } from "@/components/companies/CompanyFitCard";
import { SpotlightCard } from "@/components/ui/premium/SpotlightCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { PLACEMENT_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatScore } from "@/lib/utils";
import type { ResumeItem, StudentListItem } from "@/types";
import type {
  StudentRoleInterestItem,
  StudentTechSkillItem,
  TechSkillItem,
} from "@/types/tech-stack";
import type { ReadinessSnapshotItem } from "@/types/readiness";
import type { StudentCompanyMatchItem } from "@/types/company";
import type { StudentPlacementHistoryItem } from "@/types/placement-drive";
import type { GitHubProfileItem } from "@/types/github";
import type {
  CodingPlatformItem,
  StudentCodingProfileItem,
} from "@/types/coding-platforms";
import type {
  CompanySkillEvidenceFit,
  StudentSkillEvidenceBundle,
} from "@/types/skill-evidence";
import { PlacementHistoryCard } from "@/components/placement-drives/PlacementHistoryCard";
import { ExternalLink, Github, Linkedin } from "lucide-react";
import Link from "next/link";

interface StudentDetailViewProps {
  student: StudentListItem;
  resume: ResumeItem | null;
  techSkills: StudentTechSkillItem[];
  roleInterests: StudentRoleInterestItem[];
  masterSkills: TechSkillItem[];
  editPath?: string;
  canEdit?: boolean;
  canUploadResume?: boolean;
  canDownloadResume?: boolean;
  canReviewResume?: boolean;
  canDeleteResume?: boolean;
  canAnalyzeResumeInsights?: boolean;
  canApplyResumeInsights?: boolean;
  canManageSkills?: boolean;
  canVerifySkills?: boolean;
  canDeleteSkills?: boolean;
  readinessSnapshot?: ReadinessSnapshotItem | null;
  canRecalculateReadiness?: boolean;
  companyMatches?: StudentCompanyMatchItem[];
  companiesBasePath?: string;
  placementHistory?: StudentPlacementHistoryItem[];
  drivesBasePath?: string;
  githubProfile?: GitHubProfileItem | null;
  canViewGitHub?: boolean;
  canSyncGitHub?: boolean;
  githubLanguageMatches?: string[];
  codingProfiles?: StudentCodingProfileItem[];
  codingPlatforms?: CodingPlatformItem[];
  canViewCodingPlatforms?: boolean;
  canManageCodingProfiles?: boolean;
  canVerifyCodingProfiles?: boolean;
  skillEvidenceBundle?: StudentSkillEvidenceBundle | null;
  canViewSkillEvidence?: boolean;
  canRefreshSkillEvidence?: boolean;
  companyEvidenceFits?: Record<string, CompanySkillEvidenceFit>;
}

export function StudentDetailView({
  student,
  resume,
  techSkills,
  roleInterests,
  masterSkills,
  editPath,
  canEdit,
  canUploadResume = false,
  canDownloadResume = false,
  canReviewResume = false,
  canDeleteResume = false,
  canAnalyzeResumeInsights = false,
  canApplyResumeInsights = false,
  canManageSkills = false,
  canVerifySkills = false,
  canDeleteSkills = false,
  readinessSnapshot = null,
  canRecalculateReadiness = false,
  companyMatches = [],
  companiesBasePath = "",
  placementHistory = [],
  drivesBasePath = "",
  githubProfile = null,
  canViewGitHub = false,
  canSyncGitHub = false,
  githubLanguageMatches = [],
  codingProfiles = [],
  codingPlatforms = [],
  canViewCodingPlatforms = false,
  canManageCodingProfiles = false,
  canVerifyCodingProfiles = false,
  skillEvidenceBundle = null,
  canViewSkillEvidence = false,
  canRefreshSkillEvidence = false,
  companyEvidenceFits = {},
}: StudentDetailViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <SpotlightCard hoverLift gradientBorder className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-eyebrow mb-1">Student profile</p>
                <CardTitle className="text-xl">{student.fullName}</CardTitle>
                <CardDescription>
                  {student.rollNumber} · {student.branch}
                  {student.section ? ` · Section ${student.section}` : ""}
                </CardDescription>
              </div>
              <StatusBadge status={student.placementStatus} />
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Email" value={student.email} />
              <DetailItem label="Phone" value={student.phone ?? "—"} />
              <DetailItem label="Batch" value={student.batch} />
              <DetailItem
                label="Graduation Year"
                value={String(student.graduationYear)}
              />
              <DetailItem
                label="CGPA"
                value={
                  student.cgpa != null ? formatScore(student.cgpa) : "—"
                }
              />
              <DetailItem
                label="Active Backlogs"
                value={String(student.activeBacklogs)}
              />
              <DetailItem
                label="Added"
                value={formatDate(student.createdAt)}
              />
              <DetailItem
                label="Last Updated"
                value={formatDate(student.updatedAt)}
              />
            </dl>
          </CardContent>
        </SpotlightCard>

        <SpotlightCard hoverLift gradientBorder>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
            <CardDescription>
              Manually entered technical and communication assessment scores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScoreRow
              label="Technical Score"
              score={student.technicalScore}
            />
            <ScoreRow
              label="Communication Score"
              score={student.communicationScore}
            />
            {canEdit && editPath && (
              <Link
                href={editPath}
                className="mt-2 block text-center text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Update scores →
              </Link>
            )}
          </CardContent>
        </SpotlightCard>
      </div>

      <PlacementReadinessCard
        studentId={student.id}
        snapshot={readinessSnapshot}
        canRecalculate={canRecalculateReadiness}
      />

      {companiesBasePath && (
        <CompanyFitCard
          matches={companyMatches}
          requirementsBasePath={companiesBasePath}
          evidenceFits={companyEvidenceFits}
        />
      )}

      {drivesBasePath && (
        <PlacementHistoryCard
          history={placementHistory}
          drivesBasePath={drivesBasePath}
        />
      )}

      <ResumeReviewCard
        key={resume?.id ?? "no-resume"}
        studentId={student.id}
        resume={resume}
        canUpload={canUploadResume}
        canDownload={canDownloadResume}
        canReview={canReviewResume}
        canDelete={canDeleteResume}
      />

      {resume && (canAnalyzeResumeInsights || canApplyResumeInsights) && (
        <ResumeInsightsCard
          resumeId={resume.id}
          canAnalyze={canAnalyzeResumeInsights}
          canApply={canApplyResumeInsights}
        />
      )}

      <TechStackCard
        studentId={student.id}
        skills={techSkills}
        masterSkills={masterSkills}
        canManage={canManageSkills}
        canVerify={canVerifySkills}
        canDelete={canDeleteSkills}
        githubLanguageMatches={githubLanguageMatches}
      />

      {canViewGitHub && (
        <GitHubEvidenceCard
          studentId={student.id}
          githubUrl={student.githubUrl}
          initialProfile={githubProfile}
          canSync={canSyncGitHub}
          canEditUsername={canSyncGitHub}
        />
      )}

      {canViewCodingPlatforms && (
        <CodingProfilesCard
          studentId={student.id}
          initialProfiles={codingProfiles}
          platforms={codingPlatforms}
          canManage={canManageCodingProfiles}
          canVerify={canVerifyCodingProfiles}
        />
      )}

      {canViewSkillEvidence && (
        <SkillEvidenceCard
          studentId={student.id}
          initialBundle={skillEvidenceBundle}
          canRefresh={canRefreshSkillEvidence}
        />
      )}

      <RoleInterestsCard
        studentId={student.id}
        interests={roleInterests}
        canManage={canManageSkills}
        canDelete={canDeleteSkills}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Profile Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ProfileLink
              icon={Linkedin}
              label="LinkedIn"
              url={student.linkedinUrl}
            />
            <ProfileLink
              icon={Github}
              label="GitHub"
              url={student.githubUrl}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Placement Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              {PLACEMENT_STATUS_LABELS[student.placementStatus]}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-slate-900">{value}</dd>
    </div>
  );
}

function ScoreRow({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">
        {formatScore(score)}
      </span>
    </div>
  );
}

function ProfileLink({
  icon: Icon,
  label,
  url,
}: {
  icon: typeof Linkedin;
  label: string;
  url: string | null;
}) {
  if (!url) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Icon className="h-4 w-4" />
        {label} not provided
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
    >
      <Icon className="h-4 w-4" />
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
