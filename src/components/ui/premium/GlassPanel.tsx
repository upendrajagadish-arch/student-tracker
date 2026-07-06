import { cn } from "@/lib/utils";
import { type HTMLAttributes, forwardRef } from "react";

const GlassPanel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("glass-panel", className)} {...props} />
  )
);
GlassPanel.displayName = "GlassPanel";

export { GlassPanel };
