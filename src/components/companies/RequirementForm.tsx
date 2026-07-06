"use client";

import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { BATCHES, BRANCHES } from "@/lib/constants";
import {
  COMPANY_REQUIREMENT_STATUS_OPTIONS,
  JOB_TYPE_OPTIONS,
} from "@/lib/company-constants";
import { draftToRequirementInput } from "@/lib/jd-parser-utils";
import {
  companyRequirementSchema,
  type CompanyRequirementInput,
} from "@/lib/validations/company";
import type { CompanyRequirementDetail } from "@/types/company";
import type { JDParseDraft } from "@/types/jd-parser";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";

function parseList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinList(items: string[]): string {
  return items.join("\n");
}

interface RequirementFormProps {
  initialData?: CompanyRequirementDetail;
  initialDraft?: JDParseDraft;
  companyId: string;
  companyName: string;
  mode: "create" | "edit";
  redirectPath: string;
  fromJdParser?: boolean;
  forceDraftStatus?: boolean;
  onCreated?: (requirement: CompanyRequirementDetail) => void;
  topActions?: ReactNode;
}

export function RequirementForm({
  initialData,
  initialDraft,
  companyId,
  companyName,
  mode,
  redirectPath,
  fromJdParser = false,
  forceDraftStatus = false,
  onCreated,
  topActions,
}: RequirementFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [requiredSkillsText, setRequiredSkillsText] = useState(
    joinList(initialData?.requiredSkills ?? initialDraft?.requiredSkills ?? [])
  );
  const [preferredSkillsText, setPreferredSkillsText] = useState(
    joinList(initialData?.preferredSkills ?? initialDraft?.preferredSkills ?? [])
  );
  const [roleInterestsText, setRoleInterestsText] = useState(
    joinList(
      initialData?.requiredRoleInterests ??
        initialDraft?.requiredRoleInterests ??
        []
    )
  );
  const [selectedBranches, setSelectedBranches] = useState<string[]>(
    initialData?.eligibleBranches ?? initialDraft?.eligibleBranches ?? []
  );
  const [selectedBatches, setSelectedBatches] = useState<string[]>(
    initialData?.eligibleBatches ?? initialDraft?.eligibleBatches ?? []
  );

  const draftDefaults =
    initialDraft && mode === "create"
      ? draftToRequirementInput(initialDraft, companyId)
      : null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompanyRequirementInput>({
    resolver: zodResolver(companyRequirementSchema),
    defaultValues: initialData
      ? {
          companyId: initialData.companyId,
          roleTitle: initialData.roleTitle,
          jobType: initialData.jobType ?? "",
          graduationYear: initialData.graduationYear ?? undefined,
          minCgpa: initialData.minCgpa ?? undefined,
          allowActiveBacklogs: initialData.allowActiveBacklogs,
          maxActiveBacklogs: initialData.maxActiveBacklogs,
          minTechnicalScore: initialData.minTechnicalScore,
          minCommunicationScore: initialData.minCommunicationScore,
          minResumeScore: initialData.minResumeScore,
          minReadinessScore: initialData.minReadinessScore,
          requireResumeApproved: initialData.requireResumeApproved,
          requireAtsFriendly: initialData.requireAtsFriendly,
          requireLinkedIn: initialData.requireLinkedIn,
          requireGitHub: initialData.requireGitHub,
          notes: initialData.notes ?? "",
          status: initialData.status,
        }
      : draftDefaults
        ? {
            ...draftDefaults,
            companyId,
          }
        : {
            companyId,
            status: "DRAFT",
            allowActiveBacklogs: false,
            maxActiveBacklogs: 0,
            minTechnicalScore: 0,
            minCommunicationScore: 0,
            minResumeScore: 0,
            minReadinessScore: 0,
          },
  });

  useEffect(() => {
    if (!initialDraft || mode !== "create") return;
    const input = draftToRequirementInput(initialDraft, companyId);
    reset({
      ...input,
      companyId,
      status: forceDraftStatus ? "DRAFT" : input.status,
    });
    setRequiredSkillsText(joinList(initialDraft.requiredSkills));
    setPreferredSkillsText(joinList(initialDraft.preferredSkills));
    setRoleInterestsText(joinList(initialDraft.requiredRoleInterests));
    setSelectedBranches(initialDraft.eligibleBranches);
    setSelectedBatches(initialDraft.eligibleBatches);
  }, [initialDraft, companyId, mode, reset, forceDraftStatus]);

  function toggleItem(list: string[], item: string, setter: (v: string[]) => void) {
    setter(
      list.includes(item)
        ? list.filter((i) => i !== item)
        : [...list, item]
    );
  }

  async function onSubmit(data: CompanyRequirementInput) {
    setServerError(null);
    const payload: CompanyRequirementInput = {
      ...data,
      companyId,
      eligibleBranches: selectedBranches,
      eligibleBatches: selectedBatches,
      requiredSkills: parseList(requiredSkillsText),
      preferredSkills: parseList(preferredSkillsText),
      requiredRoleInterests: parseList(roleInterestsText),
      status: forceDraftStatus ? "DRAFT" : data.status,
    };

    const parsed = companyRequirementSchema.safeParse(payload);
    if (!parsed.success) {
      setServerError(parsed.error.errors[0]?.message ?? "Invalid input");
      return;
    }

    const url =
      mode === "create"
        ? "/api/company-requirements"
        : `/api/company-requirements/${initialData!.id}`;
    const method = mode === "create" ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...parsed.data,
        ...(fromJdParser && mode === "create" ? { source: "jd_parser" } : {}),
      }),
    });
    const result = await res.json();
    if (!res.ok) {
      setServerError(result.error ?? "Save failed");
      return;
    }

    if (onCreated && mode === "create") {
      onCreated(result as CompanyRequirementDetail);
      return;
    }

    router.push(redirectPath);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {fromJdParser && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          Review each extracted field below. Nothing is saved until you click{" "}
          <span className="font-semibold">Create Requirement Draft</span>.
        </div>
      )}

      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <section className="rounded-xl border border-surface-border bg-white p-6 shadow-card">
        <h2 className="mb-1 text-base font-semibold text-slate-900">
          Role Details
        </h2>
        <p className="mb-4 text-sm text-slate-500">Company: {companyName}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Role Title"
            error={errors.roleTitle?.message}
            {...register("roleTitle")}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Job Type
            </label>
            <Select {...register("jobType")}>
              <option value="">Select type</option>
              {JOB_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Status
            </label>
            <Select
              {...register("status")}
              disabled={forceDraftStatus && mode === "create"}
            >
              {COMPANY_REQUIREMENT_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            {forceDraftStatus && mode === "create" && (
              <p className="mt-1 text-xs text-slate-500">
                Saved as draft — activate after review.
              </p>
            )}
          </div>
          <FormField
            label="Graduation Year"
            type="number"
            error={errors.graduationYear?.message}
            {...register("graduationYear")}
          />
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-white p-6 shadow-card">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Eligibility
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              Eligible Branches
            </p>
            <div className="flex flex-wrap gap-2">
              {BRANCHES.map((branch) => (
                <button
                  key={branch}
                  type="button"
                  onClick={() =>
                    toggleItem(selectedBranches, branch, setSelectedBranches)
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    selectedBranches.includes(branch)
                      ? "bg-brand-100 text-brand-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {branch}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              Eligible Batches
            </p>
            <div className="flex flex-wrap gap-2">
              {BATCHES.map((batch) => (
                <button
                  key={batch}
                  type="button"
                  onClick={() =>
                    toggleItem(selectedBatches, batch, setSelectedBatches)
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    selectedBatches.includes(batch)
                      ? "bg-brand-100 text-brand-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {batch}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <FormField
            label="Minimum CGPA"
            type="number"
            step="0.1"
            error={errors.minCgpa?.message}
            {...register("minCgpa")}
          />
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" {...register("allowActiveBacklogs")} />
            Allow active backlogs
          </label>
          <FormField
            label="Max Active Backlogs"
            type="number"
            error={errors.maxActiveBacklogs?.message}
            {...register("maxActiveBacklogs")}
          />
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-white p-6 shadow-card">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Skills</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Required Skills (one per line)
            </label>
            <textarea
              rows={5}
              value={requiredSkillsText}
              onChange={(e) => setRequiredSkillsText(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              placeholder="Java&#10;React&#10;SQL"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">
              Preferred Skills (one per line)
            </label>
            <textarea
              rows={5}
              value={preferredSkillsText}
              onChange={(e) => setPreferredSkillsText(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="text-sm font-medium text-slate-700">
              Required Role Interests (one per line)
            </label>
            <textarea
              rows={3}
              value={roleInterestsText}
              onChange={(e) => setRoleInterestsText(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              placeholder="Software Engineer&#10;Full Stack Developer"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-white p-6 shadow-card">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Minimum Scores & Requirements
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField
            label="Min Technical Score"
            type="number"
            {...register("minTechnicalScore")}
          />
          <FormField
            label="Min Communication Score"
            type="number"
            {...register("minCommunicationScore")}
          />
          <FormField
            label="Min Resume Score"
            type="number"
            {...register("minResumeScore")}
          />
          <FormField
            label="Min Readiness Score"
            type="number"
            hint="System-calculated placement readiness"
            {...register("minReadinessScore")}
          />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("requireResumeApproved")} />
            Resume approved required
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("requireAtsFriendly")} />
            ATS friendly required
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("requireLinkedIn")} />
            LinkedIn required
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("requireGitHub")} />
            GitHub required
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-white p-6 shadow-card">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Notes</label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
            {...register("notes")}
          />
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        {topActions}
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(redirectPath)}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {mode === "create"
            ? fromJdParser
              ? "Create Requirement Draft"
              : "Create Requirement"
            : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
