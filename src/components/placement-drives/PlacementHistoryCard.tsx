"use client";

import {
  FinalOutcomeBadge,
  PlacementStageBadge,
} from "@/components/placement-drives/PlacementStageBadges";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatScore } from "@/lib/utils";
import type { StudentPlacementHistoryItem } from "@/types/placement-drive";
import { Briefcase } from "lucide-react";
import Link from "next/link";

interface PlacementHistoryCardProps {
  history: StudentPlacementHistoryItem[];
  drivesBasePath: string;
}

export function PlacementHistoryCard({
  history,
  drivesBasePath,
}: PlacementHistoryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Placement History</CardTitle>
        <CardDescription>
          Drives and outcomes tracked across the placement pipeline
        </CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No placement drives yet"
            description="When this student is added to a placement drive, their journey will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-3 pr-4 font-medium">Company</th>
                  <th className="pb-3 pr-4 font-medium">Drive</th>
                  <th className="pb-3 pr-4 font-medium">Role</th>
                  <th className="pb-3 pr-4 font-medium">Stage</th>
                  <th className="pb-3 pr-4 font-medium">Outcome</th>
                  <th className="pb-3 pr-4 font-medium">Package</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {history.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="py-3 pr-4 font-medium text-slate-900">
                      {row.companyName}
                    </td>
                    <td className="py-3 pr-4">
                      <Link
                        href={`${drivesBasePath}/${row.driveId}`}
                        className="font-medium text-brand-600 hover:text-brand-700"
                      >
                        {row.driveTitle}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      {row.roleTitle ?? "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <PlacementStageBadge stage={row.currentStage} />
                    </td>
                    <td className="py-3 pr-4">
                      <FinalOutcomeBadge outcome={row.finalOutcome} />
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      {row.packageLpa != null
                        ? `${formatScore(row.packageLpa)} LPA`
                        : "—"}
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-500">
                      {row.driveDate
                        ? formatDate(row.driveDate)
                        : formatDate(row.updatedAt)}
                    </td>
                    <td className="py-3 text-xs text-slate-500">
                      {row.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
