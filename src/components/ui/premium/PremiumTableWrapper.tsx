import { cn } from "@/lib/utils";
import { type HTMLAttributes, forwardRef } from "react";

interface PremiumTableWrapperProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/** Table container — CSS-only row hover, no spotlight for performance */
const PremiumTableWrapper = forwardRef<HTMLDivElement, PremiumTableWrapperProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("premium-table-wrap overflow-x-auto", className)}
      {...props}
    >
      {children}
    </div>
  )
);
PremiumTableWrapper.displayName = "PremiumTableWrapper";

export { PremiumTableWrapper };
