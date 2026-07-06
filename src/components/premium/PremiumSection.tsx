import { AnimatedText } from "@/components/premium/AnimatedText";
import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface PremiumSectionProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function PremiumSection({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: PremiumSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || description || actions) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {title && (
              <AnimatedText
                as="h2"
                className="text-lg font-semibold tracking-tight text-slate-900"
              >
                {title}
              </AnimatedText>
            )}
            {description && (
              <p className="mt-1 text-sm text-slate-600">{description}</p>
            )}
          </div>
          {actions}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
