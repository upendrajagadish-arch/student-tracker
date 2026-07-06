"use client";

import { SpotlightCard } from "@/components/premium/SpotlightCard";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface GradientStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  className?: string;
  compact?: boolean;
  accent?: "brand" | "cyan" | "gold" | "emerald" | "rose";
}

const ACCENT_STYLES: Record<
  NonNullable<GradientStatCardProps["accent"]>,
  { bar: string; icon: string }
> = {
  brand: {
    bar: "from-brand-500/50 via-brand-400/30 to-transparent",
    icon: "bg-stat-icon text-brand-600 ring-brand-100/80",
  },
  cyan: {
    bar: "from-luxury-cyan/50 via-luxury-cyan/20 to-transparent",
    icon: "bg-cyan-50 text-cyan-700 ring-cyan-100/80",
  },
  gold: {
    bar: "from-luxury-gold/50 via-luxury-gold/20 to-transparent",
    icon: "bg-amber-50 text-amber-700 ring-amber-100/80",
  },
  emerald: {
    bar: "from-emerald-500/40 via-emerald-400/20 to-transparent",
    icon: "bg-emerald-50 text-emerald-700 ring-emerald-100/80",
  },
  rose: {
    bar: "from-rose-500/40 via-rose-400/20 to-transparent",
    icon: "bg-rose-50 text-rose-700 ring-rose-100/80",
  },
};

export function GradientStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  compact = false,
  accent = "brand",
}: GradientStatCardProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <SpotlightCard
      disableSpotlight={compact}
      hoverLift
      gradientBorder
      className={cn("relative overflow-hidden p-5", className)}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r",
          styles.bar
        )}
        aria-hidden
      />
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
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1",
            styles.icon
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </SpotlightCard>
  );
}
