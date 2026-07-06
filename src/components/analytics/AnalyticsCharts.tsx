"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { formatScore } from "@/lib/utils";
import type { AnalyticsBundle } from "@/types/analytics";
import { BarChart3, Briefcase, Share2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BRAND = "#4f46e5";
const MUTED = "#94a3b8";

export function HrFunnelChart({ hrFunnel }: { hrFunnel: AnalyticsBundle["hrFunnel"] }) {
  const funnelData = [
    { stage: "Shared", count: hrFunnel.shared },
    { stage: "Viewed", count: hrFunnel.viewed },
    { stage: "Interested", count: hrFunnel.interested },
    { stage: "Shortlisted", count: hrFunnel.shortlisted },
    { stage: "Rejected", count: hrFunnel.rejected },
  ];

  if (hrFunnel.shared === 0) {
    return (
      <EmptyState
        icon={Share2}
        title="No HR shares yet"
        description="Share matched students with HR to track the engagement funnel."
      />
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={funnelData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="stage" tick={{ fontSize: 12 }} stroke={MUTED} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke={MUTED} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 13,
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {funnelData.map((_, i) => (
              <Cell
                key={i}
                fill={i === funnelData.length - 1 ? "#f59e0b" : BRAND}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BranchReadinessChart({
  branchReadiness,
}: {
  branchReadiness: AnalyticsBundle["branchReadiness"];
}) {
  const branchChartData = branchReadiness.slice(0, 8).map((b) => ({
    branch: b.branch.length > 12 ? `${b.branch.slice(0, 12)}…` : b.branch,
    readiness: b.avgReadiness,
  }));

  if (branchChartData.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No branch readiness data"
        description="Seed students or adjust filters to compare readiness by branch."
      />
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={branchChartData}
          layout="vertical"
          margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke={MUTED} />
          <YAxis
            type="category"
            dataKey="branch"
            width={90}
            tick={{ fontSize: 11 }}
            stroke={MUTED}
          />
          <Tooltip formatter={(v: number) => [formatScore(v), "Avg Readiness"]} />
          <Bar dataKey="readiness" fill={BRAND} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PlacementOutcomeFunnelChart({
  funnel,
}: {
  funnel: AnalyticsBundle["placementOutcomes"]["funnel"];
}) {
  const funnelData = [
    { stage: "Registered", count: funnel.registered },
    { stage: "Eligible", count: funnel.eligible },
    { stage: "Attended", count: funnel.attended },
    { stage: "Shortlisted", count: funnel.shortlisted },
    { stage: "Tech OK", count: funnel.technicalCleared },
    { stage: "HR OK", count: funnel.hrCleared },
    { stage: "Selected", count: funnel.selected },
    { stage: "Offered", count: funnel.offered },
    { stage: "Joined", count: funnel.joined },
    { stage: "Rejected", count: funnel.rejected },
  ];

  if (funnel.registered === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No placement pipeline data yet"
        description="Create placement drives and track student stages to see outcome funnels."
      />
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={funnelData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="stage"
            tick={{ fontSize: 11 }}
            stroke={MUTED}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={60}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke={MUTED} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 13,
            }}
          />
          <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
