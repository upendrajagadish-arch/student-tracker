"use client";

import { useReducedMotion } from "@/lib/premium-motion";
import { cn } from "@/lib/utils";
import {
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useRef,
} from "react";

interface SpotlightCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  disableSpotlight?: boolean;
  hoverLift?: boolean;
  gradientBorder?: boolean;
}

export function SpotlightCard({
  children,
  className,
  disableSpotlight = false,
  hoverLift = true,
  gradientBorder = false,
  onMouseMove,
  ...props
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const spotlightOff = disableSpotlight || reduced;

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!spotlightOff && ref.current) {
        const rect = ref.current.getBoundingClientRect();
        ref.current.style.setProperty(
          "--spotlight-x",
          `${e.clientX - rect.left}px`
        );
        ref.current.style.setProperty(
          "--spotlight-y",
          `${e.clientY - rect.top}px`
        );
      }
      onMouseMove?.(e);
    },
    [spotlightOff, onMouseMove]
  );

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      className={cn(
        "premium-card rounded-2xl border border-surface-border/80 bg-white shadow-premium",
        !spotlightOff && "premium-spotlight",
        hoverLift && "premium-hover-lift",
        gradientBorder && "premium-gradient-border",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
