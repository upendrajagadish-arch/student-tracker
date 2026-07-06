"use client";

import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import {
  BATCHES,
  BRANCHES,
  PLACEMENT_STATUS_OPTIONS,
  RESUME_STATUS_OPTIONS,
} from "@/lib/constants";
import {
  studentSchema,
  type StudentInput,
} from "@/lib/validations/student";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { StudentListItem } from "@/types";

interface StudentFormProps {
  initialData?: StudentListItem;
  mode: "create" | "edit";
  apiBasePath: string;
  redirectPath: string;
  canEditScores?: boolean;
  canEditAllFields?: boolean;
}

export function StudentForm({
  initialData,
  mode,
  apiBasePath,
  redirectPath,
  canEditScores = true,
  canEditAllFields = true,
}: StudentFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentInput>({
    resolver: zodResolver(studentSchema),
    defaultValues: initialData
      ? {
          fullName: initialData.fullName,
          rollNumber: initialData.rollNumber,
          email: initialData.email,
          phone: initialData.phone ?? "",
          branch: initialData.branch,
          section: initialData.section ?? "",
          batch: initialData.batch,
          graduationYear: initialData.graduationYear,
          cgpa: initialData.cgpa ?? undefined,
          activeBacklogs: initialData.activeBacklogs,
          placementStatus: initialData.placementStatus,
          linkedinUrl: initialData.linkedinUrl ?? "",
          githubUrl: initialData.githubUrl ?? "",
          resumeStatus: initialData.resumeStatus,
          technicalScore: initialData.technicalScore,
          communicationScore: initialData.communicationScore,
        }
      : {
          activeBacklogs: 0,
          placementStatus: "NOT_STARTED",
          resumeStatus: "NOT_UPLOADED",
          technicalScore: 0,
          communicationScore: 0,
        },
  });

  async function onSubmit(data: StudentInput) {
    setServerError(null);
    setSuccessMessage(null);

    const url =
      mode === "create"
        ? apiBasePath
        : `${apiBasePath}/${initialData?.id}`;

    const payload =
      !canEditAllFields && canEditScores
        ? {
            technicalScore: data.technicalScore,
            communicationScore: data.communicationScore,
          }
        : data;

    const res = await fetch(url, {
      method: mode === "create" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      setServerError(result.error ?? "Something went wrong.");
      return;
    }

    setSuccessMessage(
      mode === "create" ? "Student created successfully." : "Student updated."
    );
    router.push(redirectPath);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      <section className="rounded-xl border border-surface-border bg-white p-6 shadow-card">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Basic Information
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Full Name"
            required
            error={errors.fullName?.message}
            disabled={!canEditAllFields}
            {...register("fullName")}
          />
          <FormField
            label="Roll Number"
            required
            error={errors.rollNumber?.message}
            disabled={!canEditAllFields}
            {...register("rollNumber")}
          />
          <FormField
            label="Email"
            type="email"
            required
            error={errors.email?.message}
            disabled={!canEditAllFields}
            {...register("email")}
          />
          <FormField
            label="Phone"
            error={errors.phone?.message}
            disabled={!canEditAllFields}
            {...register("phone")}
          />
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-white p-6 shadow-card">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Academic Details
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Branch" required error={errors.branch?.message}>
            <Select
              disabled={!canEditAllFields}
              {...register("branch")}
            >
              <option value="">Select branch</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Section"
            error={errors.section?.message}
            disabled={!canEditAllFields}
            {...register("section")}
          />
          <FormField label="Batch" required error={errors.batch?.message}>
            <Select disabled={!canEditAllFields} {...register("batch")}>
              <option value="">Select batch</option>
              {BATCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Graduation Year"
            type="number"
            required
            error={errors.graduationYear?.message}
            disabled={!canEditAllFields}
            {...register("graduationYear")}
          />
          <FormField
            label="CGPA"
            type="number"
            step="0.01"
            error={errors.cgpa?.message}
            disabled={!canEditAllFields}
            {...register("cgpa")}
          />
          <FormField
            label="Active Backlogs"
            type="number"
            error={errors.activeBacklogs?.message}
            disabled={!canEditAllFields}
            {...register("activeBacklogs")}
          />
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-white p-6 shadow-card">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Placement & Profile
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Placement Status"
            error={errors.placementStatus?.message}
          >
            <Select disabled={!canEditAllFields} {...register("placementStatus")}>
              {PLACEMENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Resume Status" error={errors.resumeStatus?.message}>
            <Select disabled={!canEditAllFields} {...register("resumeStatus")}>
              {RESUME_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="LinkedIn URL"
            type="url"
            error={errors.linkedinUrl?.message}
            disabled={!canEditAllFields}
            {...register("linkedinUrl")}
          />
          <FormField
            label="GitHub URL"
            type="url"
            error={errors.githubUrl?.message}
            disabled={!canEditAllFields}
            {...register("githubUrl")}
          />
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-white p-6 shadow-card">
        <h2 className="text-base font-semibold text-slate-900">
          Performance Scores
        </h2>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          Technical and communication scores are entered manually. Placement
          readiness is calculated automatically by the readiness engine after
          profile, resume, and skill data is updated.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Technical Score"
            type="number"
            hint="Manually entered assessment score (0–100)"
            error={errors.technicalScore?.message}
            disabled={!canEditScores}
            {...register("technicalScore")}
          />
          <FormField
            label="Communication Score"
            type="number"
            hint="Manually entered assessment score (0–100)"
            error={errors.communicationScore?.message}
            disabled={!canEditScores}
            {...register("communicationScore")}
          />
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {mode === "create" ? "Create Student" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
