"use client";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { HR_ACCESS_ROLE_OPTIONS } from "@/lib/sharing-constants";
import type { HRCompanyAccessItem, HRUserListItem } from "@/types/sharing";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface HrAccessSectionProps {
  companyId: string;
  canManage: boolean;
}

export function HrAccessSection({
  companyId,
  canManage,
}: HrAccessSectionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [access, setAccess] = useState<HRCompanyAccessItem[]>([]);
  const [hrUsers, setHrUsers] = useState<HRUserListItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [accessRole, setAccessRole] = useState("HR_VIEWER");
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    async function load() {
      const [accessRes, usersRes] = await Promise.all([
        fetch(`/api/companies/${companyId}/hr-access`),
        fetch("/api/hr-users"),
      ]);
      if (accessRes.ok) setAccess(await accessRes.json());
      if (usersRes.ok) setHrUsers(await usersRes.json());
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  async function handleAssign() {
    if (!selectedUserId) return;
    setIsAssigning(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/hr-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, accessRole }),
      });
      if (res.ok) {
        toast("HR access assigned", "success");
        router.refresh();
        const listRes = await fetch(`/api/companies/${companyId}/hr-access`);
        if (listRes.ok) setAccess(await listRes.json());
      } else {
        toast("Failed to assign access", "error");
      }
    } finally {
      setIsAssigning(false);
    }
  }

  async function toggleAccess(accessId: string, isActive: boolean) {
    const res = await fetch(`/api/companies/${companyId}/hr-access`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessId, isActive: !isActive }),
    });
    if (res.ok) {
      toast(isActive ? "Access deactivated" : "Access activated", "success");
      const listRes = await fetch(`/api/companies/${companyId}/hr-access`);
      if (listRes.ok) setAccess(await listRes.json());
    }
  }

  async function handleCreateHr() {
    const res = await fetch("/api/hr-users/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        email: newEmail,
        password: newPassword,
      }),
    });
    if (res.ok) {
      const user = await res.json();
      toast("HR user created", "success");
      setHrUsers((prev) => [...prev, user]);
      setSelectedUserId(user.id);
      setShowCreate(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
    } else {
      const data = await res.json();
      toast(data.error ?? "Create failed", "error");
    }
  }

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-xl bg-slate-100" />;
  }

  return (
    <section className="rounded-xl border border-surface-border bg-white p-6 shadow-card">
      <h2 className="mb-4 text-base font-semibold text-slate-900">
        HR Access
      </h2>

      {canManage && (
        <div className="mb-6 space-y-3 rounded-lg border border-surface-border bg-slate-50/50 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Select HR user</option>
              {hrUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </Select>
            <Select
              value={accessRole}
              onChange={(e) => setAccessRole(e.target.value)}
            >
              {HR_ACCESS_ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Button onClick={handleAssign} isLoading={isAssigning} disabled={!selectedUserId}>
              <UserPlus className="h-4 w-4" />
              Assign
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="text-sm text-brand-600 hover:text-brand-700"
          >
            {showCreate ? "Cancel new HR user" : "+ Create new HR user"}
          </button>
          {showCreate && (
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="rounded-lg border border-surface-border px-3 py-2 text-sm"
              />
              <input
                placeholder="Email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="rounded-lg border border-surface-border px-3 py-2 text-sm"
              />
              <input
                placeholder="Temporary password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-lg border border-surface-border px-3 py-2 text-sm"
              />
              <Button size="sm" onClick={handleCreateHr} className="sm:col-span-3 sm:w-fit">
                Create HR User
              </Button>
            </div>
          )}
        </div>
      )}

      {access.length === 0 ? (
        <p className="text-sm text-slate-500">No HR users assigned yet.</p>
      ) : (
        <div className="space-y-2">
          {access.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border px-4 py-3"
            >
              <div>
                <p className="font-medium text-slate-900">{row.userName}</p>
                <p className="text-xs text-slate-500">
                  {row.userEmail} · {row.accessRole.replace("HR_", "")}
                </p>
              </div>
              {canManage && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => toggleAccess(row.id, row.isActive)}
                >
                  {row.isActive ? "Deactivate" : "Activate"}
                </Button>
              )}
              {!row.isActive && (
                <span className="text-xs text-slate-400">Inactive</span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
