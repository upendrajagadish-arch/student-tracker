"use client";

import { MatchStatusBadge } from "@/components/companies/MatchBadges";
import { HRDecisionBadge } from "@/components/sharing/SharingBadges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { formatScore } from "@/lib/utils";
import type { HrDashboardStats } from "@/types/sharing";
import { Building2, Clock, Heart, Star, Users2 } from "lucide-react";
import Link from "next/link";

interface HrDashboardContentProps {
  stats: HrDashboardStats;
}

export function HrDashboardContent({ stats }: HrDashboardContentProps) {
  if (stats.assignedCompanies.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-slate-500">
          No company access assigned yet. Contact your placement officer to get
          access to shared candidates.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Assigned Companies"
          value={stats.assignedCompanies.length}
          icon={Building2}
        />
        <StatCard
          title="Shared Candidates"
          value={stats.sharedStudentsCount}
          icon={Users2}
        />
        <StatCard
          title="Pending Review"
          value={stats.pendingReviewCount}
          icon={Clock}
        />
        <StatCard title="Interested" value={stats.interestedCount} icon={Heart} />
        <StatCard
          title="Shortlisted"
          value={stats.shortlistedCount}
          icon={Star}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recently Shared</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentlyShared.length === 0 ? (
            <p className="text-sm text-slate-500">No candidates shared yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentlyShared.map((row) => (
                <Link
                  key={row.id}
                  href={`/hr/talent-room/${row.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-surface-border p-3 transition-colors hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">{row.studentName}</p>
                    <p className="text-xs text-slate-500">
                      {row.companyName} · {row.roleTitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {formatScore(row.matchScore)}
                    </span>
                    <MatchStatusBadge status={row.matchStatus as never} />
                    <HRDecisionBadge decision={row.hrDecision} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
