"use client";

import { useReducedMotion } from "@/lib/premium-motion";
import { cn } from "@/lib/utils";
import { type HTMLAttributes, type ReactNode } from "react";

interface AnimatedTextProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Stagger delay index for grouped headings */
  delay?: number;
  as?: "div" | "h1" | "h2" | "h3" | "p" | "span";
}

export function AnimatedText({
  children,
  className,
  delay = 0,
  as: Tag = "div",
  ...props
}: AnimatedTextProps) {
  const reduced = useReducedMotion();

  return (
    <Tag
      className={cn(
        !reduced && "premium-text-reveal",
        className
      )}
      style={
        !reduced && delay > 0
          ? { animationDelay: `${delay}ms` }
          : undefined
      }
      {...props}
    >
      {children}
    </Tag>
  );
}
