"use client";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
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
import {
  ProficiencyBadge,
  SkillBadge,
  VerificationBadge,
} from "@/components/tech-stack/TechStackBadges";
import {
  DEFAULT_ROLE_INTERESTS,
  INTEREST_LEVEL_OPTIONS,
  PROFICIENCY_OPTIONS,
  ROLE_READINESS_LABELS,
  ROLE_READINESS_OPTIONS,
  SKILL_CATEGORY_LABELS,
  VERIFICATION_OPTIONS,
} from "@/lib/tech-constants";
import { formatDate } from "@/lib/utils";
import type {
  InterestLevel,
  ProficiencyLevel,
  RoleReadinessLevel,
  SkillCategory,
  StudentRoleInterestItem,
  StudentTechSkillItem,
  TechSkillItem,
  VerificationStatus,
} from "@/types/tech-stack";
import { Briefcase, Code2, Pencil, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface TechStackCardProps {
  studentId: string;
  skills: StudentTechSkillItem[];
  masterSkills: TechSkillItem[];
  canManage: boolean;
  canVerify: boolean;
  canDelete: boolean;
  githubLanguageMatches?: string[];
}

export function TechStackCard({
  studentId,
  skills: initialSkills,
  masterSkills,
  canManage,
  canVerify,
  canDelete,
  githubLanguageMatches = [],
}: TechStackCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [skills, setSkills] = useState(initialSkills);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | null>(null);
  const [editingSkill, setEditingSkill] = useState<StudentTechSkillItem | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<StudentTechSkillItem | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [techSkillId, setTechSkillId] = useState("");
  const [proficiencyLevel, setProficiencyLevel] =
    useState<ProficiencyLevel>("BEGINNER");
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>("NOT_VERIFIED");
  const [evidenceSource, setEvidenceSource] = useState("");
  const [notes, setNotes] = useState("");

  const githubMatchSet = useMemo(
    () => new Set(githubLanguageMatches.map((s) => s.toLowerCase())),
    [githubLanguageMatches]
  );

  const assignedIds = useMemo(
    () => new Set(skills.map((s) => s.techSkillId)),
    [skills]
  );

  const availableSkills = masterSkills.filter(
    (s) => dialogMode === "edit" || !assignedIds.has(s.id)
  );

  const grouped = useMemo(() => {
    const map = new Map<SkillCategory, StudentTechSkillItem[]>();
    for (const skill of skills) {
      const list = map.get(skill.skillCategory) ?? [];
      list.push(skill);
      map.set(skill.skillCategory, list);
    }
    return [...map.entries()].sort(([a], [b]) =>
      SKILL_CATEGORY_LABELS[a].localeCompare(SKILL_CATEGORY_LABELS[b])
    );
  }, [skills]);

  function openAdd() {
    setEditingSkill(null);
    setTechSkillId("");
    setProficiencyLevel("BEGINNER");
    setVerificationStatus("NOT_VERIFIED");
    setEvidenceSource("");
    setNotes("");
    setDialogMode("add");
  }

  function openEdit(skill: StudentTechSkillItem) {
    setEditingSkill(skill);
    setTechSkillId(skill.techSkillId);
    setProficiencyLevel(skill.proficiencyLevel);
    setVerificationStatus(skill.verificationStatus);
    setEvidenceSource(skill.evidenceSource ?? "");
    setNotes(skill.notes ?? "");
    setDialogMode("edit");
  }

  async function handleSave() {
    if (!techSkillId) {
      toast("Please select a skill", "error");
      return;
    }

    setIsSaving(true);
    try {
      const body = {
        techSkillId,
        proficiencyLevel,
        verificationStatus,
        evidenceSource,
        notes,
      };

      const url =
        dialogMode === "edit" && editingSkill
          ? `/api/students/${studentId}/tech-skills/${editingSkill.id}`
          : `/api/students/${studentId}/tech-skills`;

      const res = await fetch(url, {
        method: dialogMode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed to save skill", "error");
        return;
      }

      if (dialogMode === "edit") {
        setSkills((prev) => prev.map((s) => (s.id === data.id ? data : s)));
        toast("Skill updated", "success");
      } else {
        setSkills((prev) => [...prev, data]);
        toast("Skill added", "success");
      }

      setDialogMode(null);
      router.refresh();
    } catch {
      toast("Failed to save skill", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleVerify(skill: StudentTechSkillItem) {
    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/students/${studentId}/tech-skills/${skill.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verificationStatus: "FACULTY_VERIFIED",
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Verification failed", "error");
        return;
      }
      setSkills((prev) => prev.map((s) => (s.id === data.id ? data : s)));
      toast("Skill verified", "success");
      router.refresh();
    } catch {
      toast("Verification failed", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/students/${studentId}/tech-skills/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        toast(data.error ?? "Failed to remove skill", "error");
        return;
      }
      setSkills((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast("Skill removed", "success");
      setDeleteTarget(null);
      router.refresh();
    } catch {
      toast("Failed to remove skill", "error");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-brand-600" />
                Tech Stack
              </CardTitle>
              <CardDescription>
                Skills, proficiency, and verification status
              </CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Add Skill
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {skills.length === 0 ? (
            <EmptyState
              icon={Code2}
              title="No skills recorded"
              description="Add technologies this student knows to track readiness."
              className="py-8"
            />
          ) : (
            <div className="space-y-6">
              {grouped.map(([category, categorySkills]) => (
                <div key={category}>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {SKILL_CATEGORY_LABELS[category]}
                  </h4>
                  <div className="space-y-3">
                    {categorySkills.map((skill) => (
                      <div
                        key={skill.id}
                        className="rounded-lg border border-surface-border bg-slate-50/50 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <SkillBadge name={skill.skillName} />
                              <ProficiencyBadge level={skill.proficiencyLevel} />
                              <VerificationBadge
                                status={skill.verificationStatus}
                              />
                              {githubMatchSet.has(
                                skill.skillName.toLowerCase()
                              ) && (
                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
                                  GitHub Evidence
                                </span>
                              )}
                            </div>
                            {skill.evidenceSource && (
                              <p className="text-xs text-slate-500">
                                Evidence: {skill.evidenceSource}
                              </p>
                            )}
                            {skill.notes && (
                              <p className="text-sm text-slate-600">
                                {skill.notes}
                              </p>
                            )}
                            <p className="text-xs text-slate-400">
                              {skill.addedByName && (
                                <>Added by {skill.addedByName} · </>
                              )}
                              {skill.verifiedByName && skill.verifiedAt && (
                                <>
                                  Verified by {skill.verifiedByName} on{" "}
                                  {formatDate(skill.verifiedAt)} ·{" "}
                                </>
                              )}
                              Updated {formatDate(skill.updatedAt)}
                            </p>
                          </div>
                          {(canManage || canVerify || canDelete) && (
                            <div className="flex shrink-0 gap-1">
                              {canVerify &&
                                skill.verificationStatus !==
                                  "FACULTY_VERIFIED" &&
                                skill.verificationStatus !==
                                  "PERFORMANCE_VERIFIED" && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleVerify(skill)}
                                    disabled={isSaving}
                                  >
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Verify
                                  </Button>
                                )}
                              {canManage && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => openEdit(skill)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setDeleteTarget(skill)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {dialogMode && (
        <SkillFormDialog
          mode={dialogMode}
          availableSkills={availableSkills}
          techSkillId={techSkillId}
          proficiencyLevel={proficiencyLevel}
          verificationStatus={verificationStatus}
          evidenceSource={evidenceSource}
          notes={notes}
          canVerify={canVerify}
          isSaving={isSaving}
          onTechSkillIdChange={setTechSkillId}
          onProficiencyChange={setProficiencyLevel}
          onVerificationChange={setVerificationStatus}
          onEvidenceChange={setEvidenceSource}
          onNotesChange={setNotes}
          onSave={handleSave}
          onClose={() => setDialogMode(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove skill"
        description={`Remove ${deleteTarget?.skillName} from this student's tech stack?`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </>
  );
}

function SkillFormDialog({
  mode,
  availableSkills,
  techSkillId,
  proficiencyLevel,
  verificationStatus,
  evidenceSource,
  notes,
  canVerify,
  isSaving,
  onTechSkillIdChange,
  onProficiencyChange,
  onVerificationChange,
  onEvidenceChange,
  onNotesChange,
  onSave,
  onClose,
}: {
  mode: "add" | "edit";
  availableSkills: TechSkillItem[];
  techSkillId: string;
  proficiencyLevel: ProficiencyLevel;
  verificationStatus: VerificationStatus;
  evidenceSource: string;
  notes: string;
  canVerify: boolean;
  isSaving: boolean;
  onTechSkillIdChange: (v: string) => void;
  onProficiencyChange: (v: ProficiencyLevel) => void;
  onVerificationChange: (v: VerificationStatus) => void;
  onEvidenceChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-surface-border bg-white p-6 shadow-elevated">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            {mode === "add" ? "Add Skill" : "Edit Skill"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <FormField label="Skill">
            <Select
              value={techSkillId}
              onChange={(e) => onTechSkillIdChange(e.target.value)}
              disabled={mode === "edit"}
            >
              <option value="">Select skill...</option>
              {availableSkills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({SKILL_CATEGORY_LABELS[s.category]})
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Proficiency">
            <Select
              value={proficiencyLevel}
              onChange={(e) =>
                onProficiencyChange(e.target.value as ProficiencyLevel)
              }
            >
              {PROFICIENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FormField>
          {canVerify && (
            <FormField label="Verification Status">
              <Select
                value={verificationStatus}
                onChange={(e) =>
                  onVerificationChange(e.target.value as VerificationStatus)
                }
              >
                {VERIFICATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
          <FormField label="Evidence Source">
            <input
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              value={evidenceSource}
              onChange={(e) => onEvidenceChange(e.target.value)}
              placeholder="e.g. Project, Certificate, Resume"
            />
          </FormField>
          <FormField label="Notes">
            <textarea
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              rows={3}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Additional notes..."
            />
          </FormField>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} isLoading={isSaving}>
            {mode === "add" ? "Add Skill" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface RoleInterestsCardProps {
  studentId: string;
  interests: StudentRoleInterestItem[];
  canManage: boolean;
  canDelete: boolean;
}

export function RoleInterestsCard({
  studentId,
  interests: initialInterests,
  canManage,
  canDelete,
}: RoleInterestsCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [interests, setInterests] = useState(initialInterests);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRoleInterestItem | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<StudentRoleInterestItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [roleName, setRoleName] = useState("");
  const [interestLevel, setInterestLevel] = useState<InterestLevel>("MEDIUM");
  const [readinessLevel, setReadinessLevel] =
    useState<RoleReadinessLevel>("NOT_READY");
  const [notes, setNotes] = useState("");

  const usedRoles = useMemo(
    () => new Set(interests.map((i) => i.roleName)),
    [interests]
  );

  function openAdd() {
    setEditing(null);
    setRoleName("");
    setInterestLevel("MEDIUM");
    setReadinessLevel("NOT_READY");
    setNotes("");
    setDialogOpen(true);
  }

  function openEdit(item: StudentRoleInterestItem) {
    setEditing(item);
    setRoleName(item.roleName);
    setInterestLevel(item.interestLevel);
    setReadinessLevel(item.readinessLevel);
    setNotes(item.notes ?? "");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!roleName.trim()) {
      toast("Role name is required", "error");
      return;
    }

    setIsSaving(true);
    try {
      const body = { roleName, interestLevel, readinessLevel, notes };
      const url = editing
        ? `/api/students/${studentId}/role-interests/${editing.id}`
        : `/api/students/${studentId}/role-interests`;

      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed to save", "error");
        return;
      }

      if (editing) {
        setInterests((prev) => prev.map((i) => (i.id === data.id ? data : i)));
        toast("Role interest updated", "success");
      } else {
        setInterests((prev) => [...prev, data]);
        toast("Role interest added", "success");
      }

      setDialogOpen(false);
      router.refresh();
    } catch {
      toast("Failed to save", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/students/${studentId}/role-interests/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        toast("Failed to remove", "error");
        return;
      }
      setInterests((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      toast("Role interest removed", "success");
      setDeleteTarget(null);
      router.refresh();
    } catch {
      toast("Failed to remove", "error");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Role Interests</CardTitle>
              <CardDescription>
                Target roles and readiness levels
              </CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Add Role
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {interests.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No role interests"
              description="Add career roles this student is interested in."
              className="py-6"
            />
          ) : (
            <div className="space-y-3">
              {interests.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-surface-border p-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{item.roleName}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Interest: {item.interestLevel}
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {ROLE_READINESS_LABELS[item.readinessLevel]}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="mt-1 text-sm text-slate-500">{item.notes}</p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setDialogOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-surface-border bg-white p-6 shadow-elevated">
            <h2 className="mb-4 text-base font-semibold">
              {editing ? "Edit Role Interest" : "Add Role Interest"}
            </h2>
            <div className="space-y-4">
              <FormField label="Role">
                <Select
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  disabled={!!editing}
                >
                  <option value="">Select role...</option>
                  {DEFAULT_ROLE_INTERESTS.filter(
                    (r) => !usedRoles.has(r) || r === editing?.roleName
                  ).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Interest Level">
                <Select
                  value={interestLevel}
                  onChange={(e) =>
                    setInterestLevel(e.target.value as InterestLevel)
                  }
                >
                  {INTEREST_LEVEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Readiness">
                <Select
                  value={readinessLevel}
                  onChange={(e) =>
                    setReadinessLevel(e.target.value as RoleReadinessLevel)
                  }
                >
                  {ROLE_READINESS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Notes">
                <textarea
                  className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </FormField>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} isLoading={isSaving}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove role interest"
        description={`Remove ${deleteTarget?.roleName} from this student?`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </>
  );
}
