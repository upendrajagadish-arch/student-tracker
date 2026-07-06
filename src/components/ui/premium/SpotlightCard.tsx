"use client";

import { cn } from "@/lib/utils";
import {
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useRef,
} from "react";

interface SpotlightCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Disable mouse-follow spotlight (e.g. dense lists) */
  disableSpotlight?: boolean;
  /** Enable hover lift elevation */
  hoverLift?: boolean;
  /** Show animated gradient border on hover */
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

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!disableSpotlight && ref.current) {
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
    [disableSpotlight, onMouseMove]
  );

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      className={cn(
        "premium-card",
        !disableSpotlight && "premium-spotlight",
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
