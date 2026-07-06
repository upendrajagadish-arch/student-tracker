"use client";

import { useReducedMotion } from "@/lib/premium-motion";
import { cn } from "@/lib/utils";
import { type HTMLAttributes, type ReactNode } from "react";

interface AnimatedGridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Disable stagger on very large grids */
  disableStagger?: boolean;
}

export function AnimatedGrid({
  children,
  className,
  disableStagger = false,
  ...props
}: AnimatedGridProps) {
  const reduced = useReducedMotion();

  return (
    <div
      className={cn(
        !reduced && !disableStagger && "premium-animated-grid",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
