"use client";

import { MatchStatusBadge } from "@/components/companies/MatchBadges";
import { HRDecisionBadge } from "@/components/sharing/SharingBadges";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { GlassPanel } from "@/components/ui/premium/GlassPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { PremiumTableWrapper } from "@/components/ui/premium/PremiumTableWrapper";
import { HR_DECISION_OPTIONS } from "@/lib/sharing-constants";
import { formatScore } from "@/lib/utils";
import type { PaginatedResult } from "@/types";
import type { SharedStudentListItem } from "@/types/sharing";
import { Eye, Users2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface HrTalentRoomClientProps {
  result: PaginatedResult<SharedStudentListItem>;
  companies: { id: string; name: string }[];
}

export function HrTalentRoomClient({
  result,
  companies,
}: HrTalentRoomClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/hr/talent-room?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="HR workspace"
        title="Talent Room"
        description="Candidates shared with you by the placement office — verified evidence and readiness at a glance."
      />

      <GlassPanel className="flex flex-wrap gap-3 p-4">
        <input
          type="text"
          placeholder="Search candidates..."
          defaultValue={searchParams.get("search") ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateFilter("search", (e.target as HTMLInputElement).value);
            }
          }}
          className="min-w-[160px] flex-1 rounded-xl border border-surface-border/80 bg-white/80 px-3 py-2 text-sm shadow-inner-soft focus-visible:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25"
        />
        <Select
          value={searchParams.get("companyId") ?? ""}
          onChange={(e) => updateFilter("companyId", e.target.value)}
        >
          <option value="">All companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          value={searchParams.get("hrDecision") ?? ""}
          onChange={(e) => updateFilter("hrDecision", e.target.value)}
        >
          <option value="">All decisions</option>
          {HR_DECISION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </GlassPanel>

      {result.data.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="No shared candidates"
          description="When the placement office shares student profiles with your company, they will appear here."
        />
      ) : (
        <PremiumTableWrapper>
          <table className="premium-table w-full text-left text-sm">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Role</th>
                <th>Match</th>
                <th>Readiness</th>
                <th>Skills</th>
                <th>Resume</th>
                <th>Decision</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((row) => (
                <tr key={row.id}>
                  <td>
                    <p className="font-medium text-slate-900">{row.studentName}</p>
                    <p className="text-xs text-slate-500">
                      {row.branch} · {row.batch}
                    </p>
                  </td>
                  <td className="text-slate-600">
                    {row.roleTitle}
                    <br />
                    <span className="text-xs">{row.companyName}</span>
                  </td>
                  <td>
                    {formatScore(row.matchScore)}
                    <MatchStatusBadge status={row.matchStatus as never} />
                  </td>
                  <td>{formatScore(row.readinessScore)}</td>
                  <td className="text-xs text-slate-600">
                    {row.keySkills.slice(0, 3).join(", ") || "—"}
                  </td>
                  <td className="text-xs">
                    {row.hasResume
                      ? row.allowResumeDownload
                        ? "Download OK"
                        : "View only"
                      : "No"}
                  </td>
                  <td>
                    <HRDecisionBadge decision={row.hrDecision} />
                  </td>
                  <td>
                    <Link href={`/hr/talent-room/${row.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </PremiumTableWrapper>
      )}
    </div>
  );
}
