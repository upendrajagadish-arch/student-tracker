"use client";

import { AUDIT_ACTION_LABELS } from "@/lib/services/audit";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/types";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export interface AuditLogRow {
  id: string;
  actorUserId: string | null;
  actorRole: UserRole | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  description: string;
  createdAt: string;
  actorName?: string | null;
  actorEmail?: string | null;
}

interface AuditLogsTableProps {
  logs: AuditLogRow[];
  page: number;
  totalPages: number;
  basePath: string;
}

export function AuditLogsTable({
  logs,
  page,
  totalPages,
  basePath,
}: AuditLogsTableProps) {
  function pageUrl(p: number) {
    return p <= 1 ? basePath : `${basePath}?page=${p}`;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-surface-border bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-slate-50/80">
              <th className="px-4 py-3 font-medium text-slate-600">Date</th>
              <th className="px-4 py-3 font-medium text-slate-600">User</th>
              <th className="px-4 py-3 font-medium text-slate-600">Role</th>
              <th className="px-4 py-3 font-medium text-slate-600">Action</th>
              <th className="px-4 py-3 font-medium text-slate-600">Entity</th>
              <th className="px-4 py-3 font-medium text-slate-600">
                Description
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/50">
                <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                  {formatDate(log.createdAt)}{" "}
                  <span className="text-xs text-slate-400">
                    {new Date(log.createdAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-medium text-slate-900">
                    {log.actorName ?? "—"}
                  </p>
                  {log.actorEmail && (
                    <p className="text-xs text-slate-500">{log.actorEmail}</p>
                  )}
                </td>
                <td className="px-4 py-3.5 text-slate-600">
                  {log.actorRole ? USER_ROLE_LABELS[log.actorRole] : "—"}
                </td>
                <td className="px-4 py-3.5">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    {AUDIT_ACTION_LABELS[
                      log.action as keyof typeof AUDIT_ACTION_LABELS
                    ] ?? log.action}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-slate-600">
                  {log.entityType ?? "—"}
                </td>
                <td className="max-w-xs px-4 py-3.5 text-slate-600">
                  {log.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-surface-border px-4 py-3">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-1">
            <Link href={pageUrl(page - 1)}>
              <Button variant="secondary" size="sm" disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            </Link>
            <Link href={pageUrl(page + 1)}>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
