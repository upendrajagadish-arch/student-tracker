"use client";

import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { parseApiErrorMessage } from "@/lib/api-errors";
import type { PlacementDriveDetail } from "@/types/placement-drive";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CompanyOption {
  id: string;
  name: string;
}

interface RequirementOption {
  id: string;
  label: string;
  companyId: string;
}

interface PlacementDriveFormProps {
  companies: CompanyOption[];
  requirements: RequirementOption[];
  initialData?: PlacementDriveDetail;
  apiBasePath?: string;
  redirectPath: string;
  mode: "create" | "edit";
}

export function PlacementDriveForm({
  companies,
  requirements,
  initialData,
  redirectPath,
  mode,
}: PlacementDriveFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [companyId, setCompanyId] = useState(initialData?.companyId ?? "");
  const [requirementId, setRequirementId] = useState(
    initialData?.companyRequirementId ?? ""
  );
  const [driveTitle, setDriveTitle] = useState(initialData?.driveTitle ?? "");
  const [driveDate, setDriveDate] = useState(
    initialData?.driveDate?.slice(0, 10) ?? ""
  );
  const [venue, setVenue] = useState(initialData?.venue ?? "");
  const [modeVal, setModeVal] = useState(initialData?.mode ?? "OFFLINE");
  const [status, setStatus] = useState(initialData?.status ?? "DRAFT");
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const filteredReqs = requirements.filter((r) => r.companyId === companyId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        companyId,
        companyRequirementId: requirementId || null,
        driveTitle,
        driveDate: driveDate || null,
        venue: venue || null,
        mode: modeVal,
        status,
        notes: notes || null,
      };

      const url =
        mode === "create"
          ? "/api/placement-drives"
          : `/api/placement-drives/${initialData!.id}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(parseApiErrorMessage(data, "Save failed"), "error");
        return;
      }
      toast(mode === "create" ? "Drive created" : "Drive updated", "success");
      router.push(redirectPath || `/admin/placement-drives/${data.data?.id ?? initialData!.id}`);
      router.refresh();
    } catch {
      toast("Save failed", "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "create" ? "New Placement Drive" : "Edit Drive"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Company</label>
            <Select
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setRequirementId("");
              }}
              required
            >
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Role requirement (optional)
            </label>
            <Select
              value={requirementId}
              onChange={(e) => setRequirementId(e.target.value)}
            >
              <option value="">No linked requirement</option>
              {filteredReqs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>

          <FormField
            label="Drive title"
            value={driveTitle}
            onChange={(e) => setDriveTitle(e.target.value)}
            required
          />
          <FormField
            label="Drive date"
            type="date"
            value={driveDate}
            onChange={(e) => setDriveDate(e.target.value)}
          />
          <FormField
            label="Venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Campus block or online link"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Mode</label>
              <Select value={modeVal} onChange={(e) => setModeVal(e.target.value as typeof modeVal)}>
                <option value="OFFLINE">On Campus</option>
                <option value="ONLINE">Online</option>
                <option value="HYBRID">Hybrid</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Status</label>
              <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="DRAFT">Draft</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="ONGOING">Ongoing</option>
                <option value="COMPLETED">Completed</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" isLoading={isSaving}>
              {mode === "create" ? "Create Drive" : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
