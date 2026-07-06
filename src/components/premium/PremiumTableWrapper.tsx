import { cn } from "@/lib/utils";
import { type HTMLAttributes, type ReactNode } from "react";

interface PremiumTableWrapperProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function PremiumTableWrapper({
  children,
  className,
  ...props
}: PremiumTableWrapperProps) {
  return (
    <div
      className={cn(
        "premium-table overflow-hidden rounded-2xl border border-surface-border/80 bg-white shadow-premium",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
