import { AnimatedText } from "@/components/premium/AnimatedText";
import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface PremiumPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PremiumPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PremiumPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="space-y-2">
        {eyebrow && (
          <AnimatedText
            as="p"
            delay={0}
            className="text-xs font-semibold uppercase tracking-widest text-brand-600"
          >
            {eyebrow}
          </AnimatedText>
        )}
        <AnimatedText
          as="h1"
          delay={60}
          className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl"
        >
          {title}
        </AnimatedText>
        {description && (
          <AnimatedText
            as="p"
            delay={120}
            className="max-w-2xl text-sm leading-relaxed text-slate-600"
          >
            {description}
          </AnimatedText>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
