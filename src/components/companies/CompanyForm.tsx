"use client";

import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { companySchema, type CompanyInput } from "@/lib/validations/company";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { CompanyDetail } from "@/types/company";

interface CompanyFormProps {
  initialData?: CompanyDetail;
  mode: "create" | "edit";
  redirectPath: string;
}

export function CompanyForm({
  initialData,
  mode,
  redirectPath,
}: CompanyFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanyInput>({
    resolver: zodResolver(companySchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          website: initialData.website ?? "",
          industry: initialData.industry ?? "",
          location: initialData.location ?? "",
          contactPerson: initialData.contactPerson ?? "",
          contactEmail: initialData.contactEmail ?? "",
          contactPhone: initialData.contactPhone ?? "",
          notes: initialData.notes ?? "",
          isActive: initialData.isActive,
        }
      : { isActive: true },
  });

  async function onSubmit(data: CompanyInput) {
    setServerError(null);
    const url =
      mode === "create"
        ? "/api/companies"
        : `/api/companies/${initialData!.id}`;
    const method = mode === "create" ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      setServerError(result.error ?? "Save failed");
      return;
    }
    router.push(redirectPath);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <section className="rounded-xl border border-surface-border bg-white p-6 shadow-card">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Company Profile
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Company Name"
            error={errors.name?.message}
            {...register("name")}
          />
          <FormField
            label="Website"
            type="url"
            placeholder="https://"
            error={errors.website?.message}
            {...register("website")}
          />
          <FormField
            label="Industry"
            error={errors.industry?.message}
            {...register("industry")}
          />
          <FormField
            label="Location"
            error={errors.location?.message}
            {...register("location")}
          />
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-white p-6 shadow-card">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Contact Person"
            error={errors.contactPerson?.message}
            {...register("contactPerson")}
          />
          <FormField
            label="Contact Email"
            type="email"
            error={errors.contactEmail?.message}
            {...register("contactEmail")}
          />
          <FormField
            label="Contact Phone"
            error={errors.contactPhone?.message}
            {...register("contactPhone")}
          />
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-white p-6 shadow-card">
        <div className="space-y-1.5">
          <label htmlFor="notes" className="text-sm font-medium text-slate-700">
            Notes
          </label>
          <textarea
            id="notes"
            rows={4}
            className="flex w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm"
            {...register("notes")}
          />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register("isActive")} className="rounded" />
          Active company
        </label>
      </section>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(redirectPath)}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {mode === "create" ? "Create Company" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
