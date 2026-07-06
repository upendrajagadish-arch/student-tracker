import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="space-y-2">
        {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
