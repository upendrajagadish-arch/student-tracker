"use client";

import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { SKILL_CATEGORY_LABELS, SKILL_CATEGORY_OPTIONS } from "@/lib/tech-constants";
import type { SkillCategory, TechSkillItem } from "@/types/tech-stack";
import { Pencil, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SkillMasterPanelProps {
  skills: TechSkillItem[];
}

export function SkillMasterPanel({ skills: initialSkills }: SkillMasterPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [skills, setSkills] = useState(initialSkills);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TechSkillItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<SkillCategory>("OTHER");
  const [isActive, setIsActive] = useState(true);

  function openAdd() {
    setEditing(null);
    setName("");
    setCategory("OTHER");
    setIsActive(true);
    setDialogOpen(true);
  }

  function openEdit(skill: TechSkillItem) {
    setEditing(skill);
    setName(skill.name);
    setCategory(skill.category);
    setIsActive(skill.isActive);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast("Skill name is required", "error");
      return;
    }

    setIsSaving(true);
    try {
      const body = { name, category, isActive };
      const url = editing ? `/api/tech-skills/${editing.id}` : "/api/tech-skills";
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
        setSkills((prev) => prev.map((s) => (s.id === data.id ? data : s)));
        toast("Skill updated", "success");
      } else {
        setSkills((prev) => [...prev, data]);
        toast("Skill created", "success");
      }

      setDialogOpen(false);
      router.refresh();
    } catch {
      toast("Failed to save", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleActive(skill: TechSkillItem) {
    try {
      const res = await fetch(`/api/tech-skills/${skill.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !skill.isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast("Failed to update", "error");
        return;
      }
      setSkills((prev) => prev.map((s) => (s.id === data.id ? data : s)));
      toast(data.isActive ? "Skill activated" : "Skill deactivated", "success");
      router.refresh();
    } catch {
      toast("Failed to update", "error");
    }
  }

  const grouped = skills.reduce(
    (acc, skill) => {
      const list = acc[skill.category] ?? [];
      list.push(skill);
      acc[skill.category] = list;
      return acc;
    },
    {} as Record<SkillCategory, TechSkillItem[]>
  );

  return (
    <>
      <div className="rounded-xl border border-surface-border bg-white p-4 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Skill Master List</h3>
            <p className="text-xs text-slate-500">
              Manage available skills for student tech stack tracking
            </p>
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add Skill
          </Button>
        </div>

        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, catSkills]) => (
            <div key={cat}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {SKILL_CATEGORY_LABELS[cat as SkillCategory]}
              </h4>
              <div className="divide-y divide-surface-border rounded-lg border border-surface-border">
                {catSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          skill.isActive
                            ? "text-sm font-medium text-slate-900"
                            : "text-sm text-slate-400 line-through"
                        }
                      >
                        {skill.name}
                      </span>
                      {!skill.isActive && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openEdit(skill)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => toggleActive(skill)}
                      >
                        {skill.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setDialogOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-surface-border bg-white p-6 shadow-elevated">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {editing ? "Edit Skill" : "Create Skill"}
              </h2>
              <button onClick={() => setDialogOpen(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <FormField label="Skill Name">
                <input
                  className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </FormField>
              <FormField label="Category">
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SkillCategory)}
                >
                  {SKILL_CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              {editing && (
                <FormField label="Status">
                  <Select
                    value={isActive ? "active" : "inactive"}
                    onChange={(e) => setIsActive(e.target.value === "active")}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </FormField>
              )}
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
    </>
  );
}
