"use client";

import { cn } from "@/lib/utils";
import { type HTMLAttributes, type ReactNode } from "react";

interface PremiumCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverLift?: boolean;
}

export function PremiumCard({
  children,
  className,
  hoverLift = false,
  ...props
}: PremiumCardProps) {
  return (
    <div
      className={cn(
        "premium-card rounded-2xl border border-surface-border/80 bg-white shadow-premium",
        hoverLift && "premium-hover-lift",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
