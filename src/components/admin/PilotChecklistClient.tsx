"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { PilotChecklistResult } from "@/lib/services/pilot-checklist";
import { CheckCircle2, Circle, RefreshCw, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function PilotChecklistClient({
  checklist,
  basePath,
}: {
  checklist: PilotChecklistResult;
  basePath: string;
}) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "rounded-xl border p-6",
          checklist.isPilotReady
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        )}
      >
        <p className="text-lg font-semibold text-slate-900">
          {checklist.isPilotReady
            ? "Pilot environment looks ready"
            : "Pilot setup needs attention"}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {checklist.readyCount} of {checklist.totalCount} checks passing.
          Database: {checklist.infrastructure.databaseProvider} · Storage:{" "}
          {checklist.infrastructure.storageProvider}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => router.refresh()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Link href={`${basePath}/reports`}>
            <Button variant="secondary">Open Reports</Button>
          </Link>
          <Link href={`${basePath}/analytics`}>
            <Button variant="secondary">Open Analytics</Button>
          </Link>
          <Link href={`${basePath}/students`}>
            <Button>View Students</Button>
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Load test: run <code className="rounded bg-white/80 px-1">npm run seed:large</code> then{" "}
          <code className="rounded bg-white/80 px-1">npm run pilot:smoke</code>.
          See docs/PILOT_READINESS.md.
        </p>
      </div>

      <div className="grid gap-3">
        {checklist.items.map((row) => (
          <div
            key={row.id}
            className="flex items-start gap-4 rounded-xl border border-surface-border bg-white p-4 shadow-card"
          >
            <StatusIcon status={row.status} />
            <div className="flex-1">
              <p className="font-medium text-slate-900">{row.label}</p>
              <p className="text-sm text-slate-500">{row.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusIcon({
  status,
}: {
  status: PilotChecklistResult["items"][0]["status"];
}) {
  if (status === "ready") {
    return <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />;
  }
  if (status === "partial") {
    return <Circle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />;
  }
  return <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />;
}
