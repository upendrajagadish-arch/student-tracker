"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { type ComponentPropsWithoutRef, forwardRef } from "react";

type PremiumButtonProps = ComponentPropsWithoutRef<typeof Button>;

export const PremiumButton = forwardRef<HTMLButtonElement, PremiumButtonProps>(
  function PremiumButton({ className, variant = "primary", ...props }, ref) {
    return (
      <Button
        ref={ref}
        variant={variant}
        className={cn(
          "premium-button-shine transition-all duration-200",
          variant === "primary" &&
            "shadow-premium hover:shadow-premium-lg",
          className
        )}
        {...props}
      />
    );
  }
);
