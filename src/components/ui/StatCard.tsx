"use client";

import { SpotlightCard } from "@/components/ui/premium/SpotlightCard";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  className?: string;
  /** Disable spotlight on dense dashboard grids */
  compact?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  compact = false,
}: StatCardProps) {
  return (
    <SpotlightCard
      disableSpotlight={compact}
      hoverLift
      gradientBorder
      className={cn("p-5", className)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p className="text-2xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs leading-relaxed text-slate-500">{subtitle}</p>
          )}
          {trend && (
            <p className="text-xs font-medium text-emerald-600">{trend}</p>
          )}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stat-icon text-brand-600 ring-1 ring-brand-100/80">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </SpotlightCard>
  );
}
