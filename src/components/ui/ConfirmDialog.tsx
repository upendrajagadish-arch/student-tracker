"use client";

import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/premium/GlassPanel";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onCancel]);

  if (!mounted || !open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-luxury-navy/50 backdrop-blur-md"
        onClick={onCancel}
        aria-hidden
      />
      <GlassPanel
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className={cn("relative w-full max-w-md animate-slide-up p-6")}
      >
        <div className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h2
              id="confirm-title"
              className="text-base font-semibold text-slate-900"
            >
              {title}
            </h2>
            <p id="confirm-desc" className="text-sm leading-relaxed text-slate-500">
              {description}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </GlassPanel>
    </div>
  );
}
