"use client";

import {
  EligibilityStatusBadge,
  MatchStatusBadge,
  SkillChip,
} from "@/components/companies/MatchBadges";
import {
  HRDecisionBadge,
  ShareStatusBadge,
} from "@/components/sharing/SharingBadges";
import { ReadinessStatusBadge } from "@/components/readiness/ReadinessBadges";
import { SpotlightCard } from "@/components/ui/premium/SpotlightCard";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { HR_DECISION_OPTIONS } from "@/lib/sharing-constants";
import { RESUME_REVIEW_STATUS_LABELS } from "@/lib/resume-constants";
import { formatScore } from "@/lib/utils";
import type { HrSharedStudentDetail } from "@/types/sharing";
import { Download, ExternalLink, FileBadge, Gauge } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function HrTalentDetailClient({
  detail: initial,
  shareId,
}: {
  detail: HrSharedStudentDetail;
  shareId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [detail, setDetail] = useState(initial);
  const [hrDecision, setHrDecision] = useState(detail.share.hrDecision);
  const [hrComments, setHrComments] = useState(detail.share.hrComments ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/hr/talent-room/${shareId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hrDecision, hrComments }),
      });
      if (!res.ok) {
        toast("Failed to save decision", "error");
        return;
      }
      toast("Decision saved", "success");
      setDetail((d) => ({
        ...d,
        share: { ...d.share, hrDecision, hrComments },
      }));
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/hr/talent-room/${shareId}/resume`);
      if (!res.ok) {
        toast("Resume download not allowed", "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        detail.resume?.originalFileName ?? "resume.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <SpotlightCard hoverLift gradientBorder className="flex flex-wrap items-start justify-between gap-4 p-6">
        <div>
          <p className="section-eyebrow mb-1">Candidate profile</p>
          <p className="text-sm text-slate-500">
            {detail.company.name} · {detail.requirement.roleTitle}
          </p>
          <h1 className="page-title-gradient text-2xl font-bold">
            {detail.student.fullName}
          </h1>
          <p className="text-sm text-slate-500">
            {detail.student.rollNumber} · {detail.student.branch} ·{" "}
            {detail.student.batch}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ShareStatusBadge status={detail.share.shareStatus} />
            <HRDecisionBadge decision={detail.share.hrDecision} />
          </div>
        </div>
        {detail.match && (
          <div className="rounded-2xl border border-brand-100/80 bg-gradient-to-br from-brand-50/80 to-white px-5 py-4 text-center shadow-inner-soft">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Match Score
            </p>
            <p className="text-3xl font-bold tracking-tight text-slate-900">
              {formatScore(detail.match.matchScore)}
            </p>
            <MatchStatusBadge status={detail.match.matchStatus as never} />
          </div>
        )}
      </SpotlightCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile Summary</CardTitle>
            <CardDescription>Read-only shared profile</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <Item label="Email" value={detail.student.email} />
              <Item label="Phone" value={detail.student.phone ?? "—"} />
              <Item label="CGPA" value={detail.student.cgpa != null ? formatScore(detail.student.cgpa) : "—"} />
              <Item label="Backlogs" value={String(detail.student.activeBacklogs)} />
              <Item label="Graduation" value={String(detail.student.graduationYear)} />
              <Item label="Technical" value={formatScore(detail.student.technicalScore)} />
              <Item label="Communication" value={formatScore(detail.student.communicationScore)} />
            </dl>
            <div className="mt-4 flex flex-wrap gap-3">
              {detail.student.linkedinUrl && (
                <a
                  href={detail.student.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-brand-600"
                >
                  LinkedIn <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {detail.student.githubUrl && (
                <a
                  href={detail.student.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-brand-600"
                >
                  GitHub <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-brand-600" />
              Readiness
            </CardTitle>
          </CardHeader>
          <CardContent>
            {detail.readiness ? (
              <div className="space-y-2 text-sm">
                <p className="text-2xl font-bold">{formatScore(detail.readiness.overallScore)}</p>
                <ReadinessStatusBadge status={detail.readiness.readinessStatus as never} />
                <p className="text-slate-600">
                  Tech {formatScore(detail.readiness.techStackReadiness)} · Resume{" "}
                  {formatScore(detail.readiness.resumeReadiness)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Not calculated</p>
            )}
          </CardContent>
        </Card>
      </div>

      {detail.resume && (
        <Card>
          <CardHeader>
            <CardTitle>Resume</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm">
              <p className="font-medium">{detail.resume.originalFileName}</p>
              <p className="text-slate-500">
                {RESUME_REVIEW_STATUS_LABELS[detail.resume.reviewStatus as keyof typeof RESUME_REVIEW_STATUS_LABELS] ?? detail.resume.reviewStatus}
                {" · "}Score {formatScore(detail.resume.resumeScore)}
                {detail.resume.atsFriendly ? " · ATS friendly" : ""}
              </p>
            </div>
            {detail.share.allowResumeDownload ? (
              <Button onClick={handleDownload} isLoading={isDownloading}>
                <Download className="h-4 w-4" />
                Download Resume
              </Button>
            ) : (
              <p className="text-sm text-slate-400">Resume download not enabled</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBadge className="h-5 w-5 text-brand-600" />
            Placement Passport
          </CardTitle>
          <CardDescription>
            Premium readiness summary for this candidate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {detail.share.allowPlacementPassport ? (
            <Link href={`/hr/talent-room/${shareId}/passport`}>
              <Button>
                <FileBadge className="h-4 w-4" />
                View Placement Passport
              </Button>
            </Link>
          ) : (
            <p className="text-sm text-slate-500">
              Placement Passport access has not been enabled for this candidate.
            </p>
          )}
        </CardContent>
      </Card>

      {detail.match && (
        <Card>
          <CardHeader>
            <CardTitle>Company Fit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <MatchStatusBadge status={detail.match.matchStatus as never} />
              <EligibilityStatusBadge status={detail.match.eligibilityStatus as never} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">Matched skills</p>
              <div className="flex flex-wrap gap-1">
                {detail.match.matchedSkills.map((s) => (
                  <SkillChip key={s} label={s} variant="matched" />
                ))}
              </div>
            </div>
            {detail.match.missingSkills.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Missing skills</p>
                <div className="flex flex-wrap gap-1">
                  {detail.match.missingSkills.map((s) => (
                    <SkillChip key={s} label={s} variant="missing" />
                  ))}
                </div>
              </div>
            )}
            {detail.match.risks.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Risks</p>
                <div className="flex flex-wrap gap-1">
                  {detail.match.risks.map((r) => (
                    <SkillChip key={r} label={r} variant="risk" />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Skill Evidence</CardTitle>
          <CardDescription>
            Verified and strongly evidenced skills shared with HR
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {detail.evidenceSummary.verifiedSkills.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500">Verified Skills</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {detail.evidenceSummary.verifiedSkills.map((s) => (
                  <SkillChip key={s} label={s} variant="matched" />
                ))}
              </div>
            </div>
          )}
          {detail.evidenceSummary.strongEvidenceSkills.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500">Strong Evidence</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {detail.evidenceSummary.strongEvidenceSkills.map((s) => (
                  <SkillChip key={s} label={s} variant="matched" />
                ))}
              </div>
            </div>
          )}
          {detail.evidenceSummary.githubSummary && (
            <p className="text-slate-600">{detail.evidenceSummary.githubSummary}</p>
          )}
          {detail.evidenceSummary.codingPlatformSummary && (
            <p className="text-slate-600">
              Coding: {detail.evidenceSummary.codingPlatformSummary}
            </p>
          )}
          {detail.evidenceSummary.verifiedSkills.length === 0 &&
            detail.evidenceSummary.strongEvidenceSkills.length === 0 &&
            !detail.evidenceSummary.githubSummary &&
            !detail.evidenceSummary.codingPlatformSummary && (
              <p className="text-slate-500">No verified skill evidence on record yet.</p>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tech Stack</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {detail.techSkills.length === 0 ? (
              <p className="text-sm text-slate-500">No skills recorded</p>
            ) : (
              detail.techSkills.map((s) => (
                <SkillChip key={s.name} label={s.name} variant="matched" />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Review</CardTitle>
          <CardDescription>Update hiring decision for this candidate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Decision</label>
            <Select
              value={hrDecision}
              onChange={(e) => setHrDecision(e.target.value as typeof hrDecision)}
              className="mt-1"
            >
              {HR_DECISION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Comments</label>
            <textarea
              rows={3}
              value={hrComments}
              onChange={(e) => setHrComments(e.target.value)}
              className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              placeholder="Notes for your hiring team..."
            />
          </div>
          <Button onClick={handleSave} isLoading={isSaving}>
            Save Decision
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
