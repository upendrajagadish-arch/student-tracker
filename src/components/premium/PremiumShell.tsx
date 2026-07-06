"use client";

import { LuxuryBackground } from "@/components/premium/LuxuryBackground";
import { PageTransition } from "@/components/premium/PageTransition";
import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface PremiumShellProps {
  children: ReactNode;
  className?: string;
  /** Show subtle animated background */
  ambient?: boolean;
}

export function PremiumShell({
  children,
  className,
  ambient = true,
}: PremiumShellProps) {
  return (
    <div className={cn("relative min-h-full", className)}>
      {ambient && <LuxuryBackground variant="default" />}
      <PageTransition className="relative z-[1]">{children}</PageTransition>
    </div>
  );
}
