"use client";

import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary:
        "bg-gradient-to-b from-brand-600 to-brand-700 text-white shadow-sm hover:from-brand-500 hover:to-brand-600 hover:shadow-glow active:scale-[0.98] disabled:from-brand-500 disabled:to-brand-600",
      secondary:
        "bg-white/90 text-slate-700 border border-surface-border shadow-inner-soft hover:bg-white hover:border-slate-300 hover:shadow-card active:scale-[0.98]",
      ghost:
        "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 active:scale-[0.98]",
      danger:
        "bg-gradient-to-b from-rose-600 to-rose-700 text-white hover:from-rose-500 hover:to-rose-600 active:scale-[0.98]",
      outline:
        "border border-surface-border bg-white/80 text-slate-700 hover:bg-white hover:border-brand-200 hover:text-brand-700 active:scale-[0.98]",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs rounded-lg",
      md: "h-10 px-4 text-sm rounded-xl",
      lg: "h-11 px-6 text-sm rounded-xl",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100",
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
