"use client";

import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 px-6 py-16 text-center shadow-inner-soft",
        className
      )}
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 text-slate-500 ring-1 ring-slate-200/60">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function EmptyStateButton({
  children,
  onClick,
  href,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  if (href) {
    return (
      <a href={href}>
        <Button>{children}</Button>
      </a>
    );
  }
  return <Button onClick={onClick}>{children}</Button>;
}
