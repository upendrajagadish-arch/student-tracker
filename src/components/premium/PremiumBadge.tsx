import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

export type PremiumBadgeTone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "gold"
  | "brand"
  | "cyan"
  | "neutral";

interface PremiumBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: PremiumBadgeTone;
  /** Alias for tone */
  variant?: PremiumBadgeTone;
}

const TONE_STYLES: Record<PremiumBadgeTone, string> = {
  default: "bg-slate-100/90 text-slate-700 ring-slate-200/60",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200/60",
  warning: "bg-amber-50 text-amber-900 ring-amber-200/60",
  danger: "bg-rose-50 text-rose-800 ring-rose-200/60",
  info: "bg-brand-50 text-brand-800 ring-brand-200/60",
  brand: "bg-brand-50 text-brand-800 ring-brand-200/60",
  gold: "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-900 ring-amber-200/50",
  cyan: "bg-cyan-50 text-cyan-800 ring-cyan-200/60",
  neutral: "bg-slate-50 text-slate-600 ring-slate-200/50",
};

export function PremiumBadge({
  className,
  tone,
  variant,
  children,
  ...props
}: PremiumBadgeProps) {
  const resolved = tone ?? variant ?? "default";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONE_STYLES[resolved],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
