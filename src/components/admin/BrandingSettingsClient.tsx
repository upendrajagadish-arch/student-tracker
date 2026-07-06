"use client";

import { BrandingMark } from "@/components/branding/BrandingMark";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { parseApiErrorMessage } from "@/lib/api-errors";
import { LOGO_MAX_BYTES } from "@/lib/branding-constants";
import type { AppSettingsRecord, PublicBrandingSettings } from "@/types/branding";
import { ImageIcon, Save, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

interface BrandingSettingsClientProps {
  initialSettings: AppSettingsRecord;
  initialBranding: PublicBrandingSettings;
  canEdit: boolean;
  backHref: string;
}

export function BrandingSettingsClient({
  initialSettings,
  initialBranding,
  canEdit,
  backHref,
}: BrandingSettingsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    institutionName: initialSettings.institutionName,
    placementCellName: initialSettings.placementCellName,
    reportHeaderText: initialSettings.reportHeaderText ?? "",
    reportFooterText: initialSettings.reportFooterText ?? "",
    contactEmail: initialSettings.contactEmail ?? "",
    contactPhone: initialSettings.contactPhone ?? "",
    website: initialSettings.website ?? "",
    address: initialSettings.address ?? "",
    defaultAcademicYear: initialSettings.defaultAcademicYear ?? "",
    primaryColor: initialSettings.primaryColor ?? "",
    reportSignatureName: initialSettings.reportSignatureName ?? "",
    reportSignatureDesignation:
      initialSettings.reportSignatureDesignation ?? "",
  });
  const [branding, setBranding] = useState(initialBranding);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(parseApiErrorMessage(data, "Save failed"), "error");
        return;
      }
      toast("Branding settings saved", "success");
      router.refresh();
    } catch {
      toast("Save failed", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogoUpload(file: File) {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch("/api/settings/branding/logo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast(parseApiErrorMessage(data, "Logo upload failed"), "error");
        return;
      }
      setBranding(data.data.branding);
      toast("Logo uploaded", "success");
      router.refresh();
    } catch {
      toast("Logo upload failed", "error");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="rounded-xl border border-surface-border bg-white p-6 shadow-card">
          <h2 className="text-sm font-semibold text-slate-900">Institution</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Institution name"
              value={form.institutionName}
              onChange={(v) => setForm((f) => ({ ...f, institutionName: v }))}
              disabled={!canEdit}
            />
            <Field
              label="Placement cell name"
              value={form.placementCellName}
              onChange={(v) => setForm((f) => ({ ...f, placementCellName: v }))}
              disabled={!canEdit}
            />
            <Field
              label="Default academic year"
              value={form.defaultAcademicYear}
              onChange={(v) =>
                setForm((f) => ({ ...f, defaultAcademicYear: v }))
              }
              disabled={!canEdit}
              placeholder="e.g. 2025-26"
            />
            <Field
              label="Primary color (hex)"
              value={form.primaryColor}
              onChange={(v) => setForm((f) => ({ ...f, primaryColor: v }))}
              disabled={!canEdit}
              placeholder="#4f46e5"
            />
          </div>
        </section>

        <section className="rounded-xl border border-surface-border bg-white p-6 shadow-card">
          <h2 className="text-sm font-semibold text-slate-900">Contact</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Contact email"
              value={form.contactEmail}
              onChange={(v) => setForm((f) => ({ ...f, contactEmail: v }))}
              disabled={!canEdit}
            />
            <Field
              label="Contact phone"
              value={form.contactPhone}
              onChange={(v) => setForm((f) => ({ ...f, contactPhone: v }))}
              disabled={!canEdit}
            />
            <Field
              label="Website"
              value={form.website}
              onChange={(v) => setForm((f) => ({ ...f, website: v }))}
              disabled={!canEdit}
              className="sm:col-span-2"
            />
            <Field
              label="Address"
              value={form.address}
              onChange={(v) => setForm((f) => ({ ...f, address: v }))}
              disabled={!canEdit}
              className="sm:col-span-2"
            />
          </div>
        </section>

        <section className="rounded-xl border border-surface-border bg-white p-6 shadow-card">
          <h2 className="text-sm font-semibold text-slate-900">
            Reports &amp; print
          </h2>
          <div className="mt-4 grid gap-4">
            <Field
              label="Report header text"
              value={form.reportHeaderText}
              onChange={(v) => setForm((f) => ({ ...f, reportHeaderText: v }))}
              disabled={!canEdit}
              multiline
            />
            <Field
              label="Report footer text"
              value={form.reportFooterText}
              onChange={(v) => setForm((f) => ({ ...f, reportFooterText: v }))}
              disabled={!canEdit}
              multiline
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Signature name"
                value={form.reportSignatureName}
                onChange={(v) =>
                  setForm((f) => ({ ...f, reportSignatureName: v }))
                }
                disabled={!canEdit}
              />
              <Field
                label="Signature designation"
                value={form.reportSignatureDesignation}
                onChange={(v) =>
                  setForm((f) => ({ ...f, reportSignatureDesignation: v }))
                }
                disabled={!canEdit}
              />
            </div>
          </div>
        </section>

        {canEdit && (
          <div className="flex justify-end">
            <Button onClick={handleSave} isLoading={isSaving}>
              <Save className="h-4 w-4" />
              Save branding
            </Button>
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-surface-border bg-white p-5 shadow-card">
          <h3 className="text-sm font-semibold text-slate-900">Preview</h3>
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
            <BrandingMark
              branding={{
                ...branding,
                institutionName: form.institutionName,
                placementCellName: form.placementCellName,
                primaryColor: form.primaryColor || branding.primaryColor,
              }}
              size="md"
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Shown on login, sidebar, passports, and print reports.
          </p>
        </div>

        {canEdit && (
          <div className="rounded-xl border border-surface-border bg-white p-5 shadow-card">
            <h3 className="text-sm font-semibold text-slate-900">
              Institution logo
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              PNG, JPG, or SVG · max {(LOGO_MAX_BYTES / 1024 / 1024).toFixed(0)} MB
            </p>
            <div className="mt-4 flex h-24 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${branding.logoUrl}?t=${Date.now()}`}
                  alt="Logo preview"
                  className="max-h-20 max-w-full object-contain p-2"
                />
              ) : (
                <ImageIcon className="h-8 w-8 text-slate-300" />
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleLogoUpload(file);
              }}
            />
            <Button
              variant="secondary"
              className="mt-3 w-full"
              isLoading={isUploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Upload logo
            </Button>
          </div>
        )}

        <p className="text-xs text-slate-500">
          Product name ({branding.productName}) and tagline remain fixed.
          {!canEdit && (
            <>
              {" "}
              <Link href={backHref} className="text-brand-600 hover:underline">
                Back to settings
              </Link>
            </>
          )}
        </p>
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  multiline,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-slate-500">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm disabled:bg-slate-50"
        />
      ) : (
        <Input
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
