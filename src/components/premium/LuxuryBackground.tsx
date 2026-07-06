"use client";

import { useReducedMotion } from "@/lib/premium-motion";
import { cn } from "@/lib/utils";

interface LuxuryBackgroundProps {
  className?: string;
  /** Stronger ambient glow for login / hero */
  variant?: "default" | "hero";
}

export function LuxuryBackground({
  className,
  variant = "default",
}: LuxuryBackgroundProps) {
  const reduced = useReducedMotion();

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden
    >
      <div className="absolute inset-0 bg-app-gradient" />
      <div
        className={cn(
          "absolute -left-1/4 top-0 h-[28rem] w-[28rem] rounded-full bg-brand-500/10 blur-3xl",
          !reduced && "animate-pulse-slow"
        )}
      />
      <div
        className={cn(
          "absolute -right-1/4 bottom-0 h-[24rem] w-[24rem] rounded-full bg-luxury-cyan/8 blur-3xl",
          !reduced && "animate-pulse-slow animation-delay-2000"
        )}
      />
      {variant === "hero" && (
        <>
          <div
            className={cn(
              "absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-luxury-gold/6 blur-3xl",
              !reduced && "animate-float"
            )}
          />
          <svg
            className={cn(
              "absolute inset-0 h-full w-full opacity-[0.04]",
              !reduced && "animate-grid-drift"
            )}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="luxury-grid"
                width="48"
                height="48"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 48 0 L 0 0 0 48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  className="text-white"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#luxury-grid)" />
          </svg>
        </>
      )}
    </div>
  );
}
