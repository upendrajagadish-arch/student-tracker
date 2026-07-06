import { cn } from "@/lib/utils";

type PremiumBadgeTone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "gold";

const toneStyles: Record<PremiumBadgeTone, string> = {
  default: "bg-slate-100/90 text-slate-700 ring-slate-200/60",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200/60",
  warning: "bg-amber-50 text-amber-900 ring-amber-200/60",
  danger: "bg-rose-50 text-rose-800 ring-rose-200/60",
  info: "bg-brand-50 text-brand-800 ring-brand-200/60",
  gold: "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-900 ring-amber-200/50",
};

interface PremiumBadgeProps {
  children: React.ReactNode;
  tone?: PremiumBadgeTone;
  className?: string;
}

export function PremiumBadge({
  children,
  tone = "default",
  className,
}: PremiumBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        toneStyles[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
