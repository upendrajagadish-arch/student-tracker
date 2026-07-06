"use client";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { CompanyRequirementDetail } from "@/types/company";
import type { HRUserListItem } from "@/types/sharing";
import { useEffect, useState } from "react";

interface ShareStudentsModalProps {
  open: boolean;
  onClose: () => void;
  requirement: CompanyRequirementDetail;
  studentIds: string[];
  onSuccess: () => void;
}

export function ShareStudentsModal({
  open,
  onClose,
  requirement,
  studentIds,
  onSuccess,
}: ShareStudentsModalProps) {
  const { toast } = useToast();
  const [hrUsers, setHrUsers] = useState<HRUserListItem[]>([]);
  const [sharedWithUserId, setSharedWithUserId] = useState("");
  const [allowResumeDownload, setAllowResumeDownload] = useState(false);
  const [allowPlacementPassport, setAllowPlacementPassport] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [sharingNote, setSharingNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/companies/${requirement.companyId}/hr-access`)
      .then((r) => r.json())
      .then((access) => {
        const ids = new Set(access.map((a: { userId: string; isActive: boolean }) => a.userId));
        fetch("/api/hr-users")
          .then((r) => r.json())
          .then((users: HRUserListItem[]) =>
            setHrUsers(users.filter((u) => ids.has(u.id) && u.isActive))
          );
      });
  }, [open, requirement.companyId]);

  if (!open) return null;

  async function handleShare() {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/shared-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: requirement.companyId,
          companyRequirementId: requirement.id,
          studentIds,
          sharedWithUserId: sharedWithUserId || null,
          allowResumeDownload,
          allowPlacementPassport,
          expiresAt: expiresAt || null,
          sharingNote: sharingNote || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Share failed", "error");
        return;
      }
      toast(
        `Shared ${data.created + data.updated} student(s) with HR`,
        "success"
      );
      onSuccess();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          Share with HR
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {requirement.companyName} · {requirement.roleTitle} ·{" "}
          {studentIds.length} student(s)
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">
              HR recipient
            </label>
            <select
              value={sharedWithUserId}
              onChange={(e) => setSharedWithUserId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
            >
              <option value="">All HR on this company</option>
              {hrUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allowResumeDownload}
              onChange={(e) => setAllowResumeDownload(e.target.checked)}
            />
            Allow resume download
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allowPlacementPassport}
              onChange={(e) => setAllowPlacementPassport(e.target.checked)}
            />
            Allow placement passport for HR
          </label>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Expiry date (optional)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Internal sharing note (optional)
            </label>
            <textarea
              rows={2}
              value={sharingNote}
              onChange={(e) => setSharingNote(e.target.value)}
              className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              placeholder="Visible to TPO/Admin only"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleShare} isLoading={isSubmitting}>
            Confirm Share
          </Button>
        </div>
      </div>
    </div>
  );
}
