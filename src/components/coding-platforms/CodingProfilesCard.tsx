"use client";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import {
  CODING_DATA_SOURCE_LABELS,
  CODING_VERIFICATION_STATUS_LABELS,
} from "@/lib/coding-platform-constants";
import { formatDate, formatScore } from "@/lib/utils";
import type {
  CodingPlatformItem,
  CodingProfileVerificationStatus,
  StudentCodingProfileItem,
} from "@/types/coding-platforms";
import {
  Code2,
  ExternalLink,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CodingProfilesCardProps {
  studentId: string;
  initialProfiles: StudentCodingProfileItem[];
  platforms: CodingPlatformItem[];
  canManage: boolean;
  canVerify: boolean;
}

export function CodingProfilesCard({
  studentId,
  initialProfiles,
  platforms,
  canManage,
  canVerify,
}: CodingProfilesCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StudentCodingProfileItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentCodingProfileItem | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  const [platformId, setPlatformId] = useState("");
  const [username, setUsername] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [totalProblemsSolved, setTotalProblemsSolved] = useState("0");
  const [easySolved, setEasySolved] = useState("");
  const [mediumSolved, setMediumSolved] = useState("");
  const [hardSolved, setHardSolved] = useState("");
  const [contestRating, setContestRating] = useState("");
  const [globalRank, setGlobalRank] = useState("");
  const [lastActivityAt, setLastActivityAt] = useState("");
  const [languages, setLanguages] = useState("");
  const [notes, setNotes] = useState("");

  function openAdd() {
    setEditing(null);
    setPlatformId(platforms[0]?.id ?? "");
    setUsername("");
    setProfileUrl("");
    setTotalProblemsSolved("0");
    setEasySolved("");
    setMediumSolved("");
    setHardSolved("");
    setContestRating("");
    setGlobalRank("");
    setLastActivityAt("");
    setLanguages("");
    setNotes("");
    setDialogOpen(true);
  }

  function openEdit(profile: StudentCodingProfileItem) {
    setEditing(profile);
    setPlatformId(profile.platformId);
    setUsername(profile.username ?? "");
    setProfileUrl(profile.profileUrl ?? "");
    setTotalProblemsSolved(String(profile.totalProblemsSolved));
    setEasySolved(profile.easySolved != null ? String(profile.easySolved) : "");
    setMediumSolved(
      profile.mediumSolved != null ? String(profile.mediumSolved) : ""
    );
    setHardSolved(profile.hardSolved != null ? String(profile.hardSolved) : "");
    setContestRating(
      profile.contestRating != null ? String(profile.contestRating) : ""
    );
    setGlobalRank(profile.globalRank != null ? String(profile.globalRank) : "");
    setLastActivityAt(
      profile.lastActivityAt ? profile.lastActivityAt.slice(0, 10) : ""
    );
    setLanguages(profile.primaryLanguages.join(", "));
    setNotes(profile.notes ?? "");
    setDialogOpen(true);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const payload = {
        platformId,
        username: username || null,
        profileUrl: profileUrl || null,
        totalProblemsSolved: Number(totalProblemsSolved) || 0,
        easySolved: easySolved ? Number(easySolved) : null,
        mediumSolved: mediumSolved ? Number(mediumSolved) : null,
        hardSolved: hardSolved ? Number(hardSolved) : null,
        contestRating: contestRating ? Number(contestRating) : null,
        globalRank: globalRank ? Number(globalRank) : null,
        lastActivityAt: lastActivityAt || null,
        primaryLanguages: languages
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean),
        notes: notes || null,
      };

      const url = editing
        ? `/api/students/${studentId}/coding-profiles/${editing.id}`
        : `/api/students/${studentId}/coding-profiles`;
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Save failed", "error");
        return;
      }

      if (editing) {
        setProfiles((prev) => prev.map((p) => (p.id === data.id ? data : p)));
      } else {
        setProfiles((prev) => [...prev, data]);
      }
      setDialogOpen(false);
      toast(editing ? "Profile updated" : "Profile added", "success");
      router.refresh();
    } catch {
      toast("Save failed", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleVerify(
    profile: StudentCodingProfileItem,
    status: CodingProfileVerificationStatus
  ) {
    try {
      const res = await fetch(
        `/api/students/${studentId}/coding-profiles/${profile.id}/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verificationStatus: status }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Verification failed", "error");
        return;
      }
      setProfiles((prev) => prev.map((p) => (p.id === data.id ? data : p)));
      toast("Verification updated", "success");
      router.refresh();
    } catch {
      toast("Verification failed", "error");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(
        `/api/students/${studentId}/coding-profiles/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        toast(data.error ?? "Delete failed", "error");
        return;
      }
      setProfiles((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast("Profile removed", "success");
      router.refresh();
    } catch {
      toast("Delete failed", "error");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              Coding Platform Evidence
            </CardTitle>
            <CardDescription>
              Manual and CSV-backed coding profiles — separate from GitHub evidence
            </CardDescription>
          </div>
          {canManage && (
            <Button variant="secondary" onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add Profile
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {profiles.length === 0 ? (
          <EmptyState
            icon={Code2}
            title="No coding profiles"
            description="Add LeetCode, HackerRank, or other platform profiles manually or via CSV import."
            className="py-8"
          />
        ) : (
          <div className="space-y-4">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="rounded-lg border border-surface-border bg-slate-50/50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand-100 px-3 py-0.5 text-xs font-semibold text-brand-800">
                        {profile.platformName}
                      </span>
                      <VerificationBadge status={profile.verificationStatus} />
                      <span className="text-xs text-slate-500">
                        {CODING_DATA_SOURCE_LABELS[profile.dataSource]}
                      </span>
                    </div>
                    {(profile.username || profile.profileUrl) && (
                      <div className="text-sm">
                        {profile.profileUrl ? (
                          <a
                            href={profile.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700"
                          >
                            {profile.username ?? profile.profileUrl}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-slate-700">
                            @{profile.username}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <Metric label="Problems" value={String(profile.totalProblemsSolved)} />
                      <Metric
                        label="Evidence"
                        value={formatScore(profile.evidenceScore)}
                      />
                      {profile.contestRating != null && (
                        <Metric label="Rating" value={String(profile.contestRating)} />
                      )}
                      {profile.globalRank != null && (
                        <Metric label="Rank" value={String(profile.globalRank)} />
                      )}
                    </div>
                    {profile.primaryLanguages.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {profile.primaryLanguages.map((lang) => (
                          <span
                            key={lang}
                            className="rounded bg-white px-2 py-0.5 text-xs text-slate-600 border"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    )}
                    {profile.lastActivityAt && (
                      <p className="text-xs text-slate-500">
                        Last activity {formatDate(profile.lastActivityAt)}
                      </p>
                    )}
                    {profile.notes && (
                      <p className="text-sm text-slate-600">{profile.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canManage && (
                      <>
                        <Button
                          variant="secondary"
                          className="h-8 px-2"
                          onClick={() => openEdit(profile)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          className="h-8 px-2"
                          onClick={() => setDeleteTarget(profile)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {canVerify && (
                      <Button
                        variant="secondary"
                        className="h-8"
                        onClick={() =>
                          handleVerify(profile, "MANUALLY_VERIFIED")
                        }
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Verify
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {editing ? "Edit Coding Profile" : "Add Coding Profile"}
            </h3>
            <div className="mt-4 space-y-3">
              <FormField label="Platform">
                <Select
                  value={platformId}
                  onChange={(e) => setPlatformId(e.target.value)}
                  disabled={Boolean(editing)}
                >
                  {platforms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Username">
                <Input value={username} onChange={(e) => setUsername(e.target.value)} />
              </FormField>
              <FormField label="Profile URL">
                <Input value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} />
              </FormField>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Total Solved">
                  <Input
                    type="number"
                    min={0}
                    value={totalProblemsSolved}
                    onChange={(e) => setTotalProblemsSolved(e.target.value)}
                  />
                </FormField>
                <FormField label="Last Activity">
                  <Input
                    type="date"
                    value={lastActivityAt}
                    onChange={(e) => setLastActivityAt(e.target.value)}
                  />
                </FormField>
                <FormField label="Easy">
                  <Input type="number" min={0} value={easySolved} onChange={(e) => setEasySolved(e.target.value)} />
                </FormField>
                <FormField label="Medium">
                  <Input type="number" min={0} value={mediumSolved} onChange={(e) => setMediumSolved(e.target.value)} />
                </FormField>
                <FormField label="Hard">
                  <Input type="number" min={0} value={hardSolved} onChange={(e) => setHardSolved(e.target.value)} />
                </FormField>
                <FormField label="Contest Rating">
                  <Input type="number" min={0} value={contestRating} onChange={(e) => setContestRating(e.target.value)} />
                </FormField>
                <FormField label="Global Rank">
                  <Input type="number" min={0} value={globalRank} onChange={(e) => setGlobalRank(e.target.value)} />
                </FormField>
              </div>
              <FormField label="Languages (comma-separated)">
                <Input value={languages} onChange={(e) => setLanguages(e.target.value)} />
              </FormField>
              <FormField label="Notes">
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </FormField>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !platformId}>
                {isSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove coding profile?"
        description={`Remove ${deleteTarget?.platformName} profile from this student?`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Card>
  );
}

function VerificationBadge({
  status,
}: {
  status: CodingProfileVerificationStatus;
}) {
  const colors: Record<CodingProfileVerificationStatus, string> = {
    NOT_VERIFIED: "bg-slate-100 text-slate-600",
    PROFILE_LINKED: "bg-sky-100 text-sky-800",
    MANUALLY_VERIFIED: "bg-emerald-100 text-emerald-800",
    CSV_VERIFIED: "bg-indigo-100 text-indigo-800",
    PUBLIC_EVIDENCE: "bg-violet-100 text-violet-800",
    FACULTY_VERIFIED: "bg-green-100 text-green-900",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status]}`}>
      {CODING_VERIFICATION_STATUS_LABELS[status]}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-900">{value}</p>
    </div>
  );
}
