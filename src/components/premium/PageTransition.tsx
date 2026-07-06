"use client";

import { useReducedMotion } from "@/lib/premium-motion";
import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const reduced = useReducedMotion();

  return (
    <div
      className={cn(!reduced && "premium-page-enter", className)}
      data-print-static
    >
      {children}
    </div>
  );
}
