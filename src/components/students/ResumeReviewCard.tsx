"use client";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { RESUME_REVIEW_STATUS_LABELS } from "@/lib/resume-constants";
import { parseApiErrorMessage } from "@/lib/api-errors";
import { formatDate, formatScore } from "@/lib/utils";
import type { ResumeItem, ResumeReviewStatus } from "@/types";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

interface ResumeReviewCardProps {
  studentId: string;
  resume: ResumeItem | null;
  canUpload: boolean;
  canDownload: boolean;
  canReview: boolean;
  canDelete: boolean;
}

export function ResumeReviewCard({
  studentId,
  resume,
  canUpload,
  canDownload,
  canReview,
  canDelete,
}: ResumeReviewCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [reviewStatus, setReviewStatus] = useState<ResumeReviewStatus>(
    resume?.reviewStatus ?? "UPLOADED"
  );
  const [resumeScore, setResumeScore] = useState(resume?.resumeScore ?? 0);
  const [atsFriendly, setAtsFriendly] = useState(resume?.atsFriendly ?? false);
  const [hasLinkedIn, setHasLinkedIn] = useState(resume?.hasLinkedIn ?? false);
  const [hasGitHub, setHasGitHub] = useState(resume?.hasGitHub ?? false);
  const [hasProjects, setHasProjects] = useState(resume?.hasProjects ?? false);
  const [hasCertifications, setHasCertifications] = useState(
    resume?.hasCertifications ?? false
  );
  const [reviewerComments, setReviewerComments] = useState(
    resume?.reviewerComments ?? ""
  );

  async function handleUpload(file: File) {
    setUploadError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/students/${studentId}/resume/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        const message = parseApiErrorMessage(data, "Upload failed");
        setUploadError(message);
        toast(message, "error");
        return;
      }

      const resume = data.data ?? data;
      toast(`Resume v${resume.version} uploaded successfully`, "success");
      router.refresh();
    } catch {
      toast("Upload failed", "error");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSaveReview(status?: ResumeReviewStatus) {
    if (!resume) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/resumes/${resume.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewStatus: status ?? reviewStatus,
          resumeScore,
          atsFriendly,
          hasLinkedIn,
          hasGitHub,
          hasProjects,
          hasCertifications,
          reviewerComments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed to save review", "error");
        return;
      }

      toast("Resume review saved", "success");
      router.refresh();
    } catch {
      toast("Failed to save review", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!resume) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/resumes/${resume.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast("Failed to deactivate resume", "error");
        return;
      }
      toast("Resume deactivated", "success");
      setShowDeleteConfirm(false);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  function handleDownload() {
    if (!resume) return;
    window.open(`/api/resumes/${resume.id}/download`, "_blank");
  }

  const uploaded = !!resume;

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Resume Review</CardTitle>
            <CardDescription>
              Upload, review, and score student resumes
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {canUpload && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={isUploading}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {uploaded ? "Upload New Version" : "Upload Resume"}
                </Button>
              </>
            )}
            {canDownload && uploaded && (
              <Button variant="secondary" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4" />
                Download
              </Button>
            )}
            {canDelete && uploaded && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
                Deactivate
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {uploadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {uploadError}
          </div>
        )}

        {!uploaded ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-surface-border py-12 text-center">
            <FileText className="mb-3 h-10 w-10 text-slate-400" />
            <p className="text-sm font-medium text-slate-900">
              No resume uploaded
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Upload a PDF or DOCX file (max 5 MB)
            </p>
          </div>
        ) : (
          <>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <InfoItem label="Resume Uploaded" value="Yes" />
              <InfoItem
                label="Active File"
                value={resume.originalFileName}
              />
              <InfoItem
                label="Uploaded"
                value={formatDate(resume.createdAt)}
              />
              <InfoItem label="Version" value={`v${resume.version}`} />
              <InfoItem
                label="Review Status"
                value={RESUME_REVIEW_STATUS_LABELS[resume.reviewStatus]}
              />
              <InfoItem
                label="Resume Score"
                value={`${formatScore(resume.resumeScore)} / 100`}
              />
              <InfoItem
                label="ATS Friendly"
                value={resume.atsFriendly ? "Yes" : "No"}
              />
              <InfoItem
                label="Uploaded By"
                value={resume.uploadedByName ?? "—"}
              />
            </dl>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <CheckItem label="LinkedIn included" checked={resume.hasLinkedIn} />
              <CheckItem label="GitHub included" checked={resume.hasGitHub} />
              <CheckItem label="Projects included" checked={resume.hasProjects} />
              <CheckItem
                label="Certifications included"
                checked={resume.hasCertifications}
              />
            </div>

            {resume.reviewerComments && !canReview && (
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase text-slate-500">
                  Reviewer Comments
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {resume.reviewerComments}
                </p>
              </div>
            )}

            {canReview && (
              <div className="space-y-4 rounded-xl border border-surface-border bg-slate-50/50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Review Form
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label="Review Status">
                    <Select
                      value={reviewStatus}
                      onChange={(e) =>
                        setReviewStatus(e.target.value as ResumeReviewStatus)
                      }
                    >
                      {Object.entries(RESUME_REVIEW_STATUS_LABELS)
                        .filter(([k]) => k !== "NOT_UPLOADED")
                        .map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                    </Select>
                  </FormField>
                  <FormField
                    label="Resume Score (0–100)"
                    type="number"
                    min={0}
                    max={100}
                    value={resumeScore}
                    onChange={(e) => setResumeScore(Number(e.target.value))}
                  />
                </div>

                <div className="flex flex-wrap gap-4">
                  <Toggle
                    label="ATS Friendly"
                    checked={atsFriendly}
                    onChange={setAtsFriendly}
                  />
                  <Toggle
                    label="LinkedIn"
                    checked={hasLinkedIn}
                    onChange={setHasLinkedIn}
                  />
                  <Toggle
                    label="GitHub"
                    checked={hasGitHub}
                    onChange={setHasGitHub}
                  />
                  <Toggle
                    label="Projects"
                    checked={hasProjects}
                    onChange={setHasProjects}
                  />
                  <Toggle
                    label="Certifications"
                    checked={hasCertifications}
                    onChange={setHasCertifications}
                  />
                </div>

                <FormField label="Reviewer Comments">
                  <textarea
                    className="flex min-h-[80px] w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm"
                    value={reviewerComments}
                    onChange={(e) => setReviewerComments(e.target.value)}
                    placeholder="Feedback for the student profile..."
                  />
                </FormField>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleSaveReview()}
                    isLoading={isSaving}
                  >
                    Save Review
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleSaveReview("UNDER_REVIEW")}
                    disabled={isSaving}
                  >
                    Mark Under Review
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleSaveReview("REVIEWED")}
                    disabled={isSaving}
                  >
                    Mark Reviewed
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleSaveReview("NEEDS_IMPROVEMENT")}
                    disabled={isSaving}
                  >
                    Needs Improvement
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleSaveReview("APPROVED")}
                    disabled={isSaving}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Deactivate resume"
        description="This will deactivate the current resume version. The file history is preserved but it will no longer be the active resume."
        confirmLabel="Deactivate"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </Card>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm text-slate-900" title={value}>
        {value}
      </dd>
    </div>
  );
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <span
        className={`h-2 w-2 rounded-full ${checked ? "bg-emerald-500" : "bg-slate-300"}`}
      />
      {label}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-surface-border text-brand-600"
      />
      {label}
    </label>
  );
}
